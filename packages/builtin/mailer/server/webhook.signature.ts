/**
 * Resend 投递回调的验签（Svix 格式）。
 *
 * 单独一个文件是为了能单测：验签写错的后果不是「功能不好用」，而是**任何人都能把
 * 任意一封信标成 bounced**，进而让 newsletter 把一个正常订阅者永久停发。
 *
 * 签名内容是 `${svix-id}.${svix-timestamp}.${原始请求体}`，HMAC-SHA256，密钥是
 * `whsec_` 之后那截 base64。签名头可能带**多个**版本（空格分隔的 `v1,<base64>`），
 * 只要有一个对得上就算通过——服务商轮换密钥时会同时发两个。
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** 时间戳容差。超过这个窗口一律拒——否则抓到一次回调就能无限重放。 */
const TOLERANCE_SECONDS = 5 * 60;

export interface WebhookHeaders {
  id: string | undefined;
  timestamp: string | undefined;
  signature: string | undefined;
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "missing" | "stale" | "mismatch" | "unconfigured" };

function secretBytes(secret: string): Buffer {
  const raw = secret.startsWith("whsec_")
    ? secret.slice("whsec_".length)
    : secret;
  return Buffer.from(raw, "base64");
}

/** 定长比较，避免按字节提前返回泄漏信息。 */
function equals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function verifyWebhookSignature(input: {
  secret: string;
  headers: WebhookHeaders;
  /** **原始**请求体字符串。重新 JSON.stringify 过的对象签不出同一个值。 */
  rawBody: string;
  nowSeconds?: number;
}): VerifyResult {
  if (!input.secret.trim()) return { ok: false, reason: "unconfigured" };

  const { id, timestamp, signature } = input.headers;
  if (!id || !timestamp || !signature) return { ok: false, reason: "missing" };

  const sent = Number(timestamp);
  if (!Number.isFinite(sent)) return { ok: false, reason: "missing" };
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - sent) > TOLERANCE_SECONDS)
    return { ok: false, reason: "stale" };

  const expected = createHmac("sha256", secretBytes(input.secret))
    .update(`${id}.${timestamp}.${input.rawBody}`)
    .digest("base64");

  // 头里可能有多个版本；任意一个对上即可（密钥轮换期会同时发两个）
  const candidates = signature
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (part.startsWith("v1,") ? part.slice("v1,".length) : ""))
    .filter(Boolean);

  if (candidates.length === 0) return { ok: false, reason: "missing" };
  return candidates.some((candidate) => equals(candidate, expected))
    ? { ok: true }
    : { ok: false, reason: "mismatch" };
}

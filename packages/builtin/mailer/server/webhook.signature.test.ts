import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { verifyWebhookSignature } from "./webhook.signature.js";

const SECRET = `whsec_${Buffer.from("super-secret-key").toString("base64")}`;
const ID = "msg_123";
const NOW = 1_800_000_000;
const BODY = '{"type":"email.bounced","data":{"email_id":"abc"}}';

function sign(body: string, timestamp: number, secret = SECRET): string {
  const raw = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const mac = createHmac("sha256", Buffer.from(raw, "base64"))
    .update(`${ID}.${timestamp}.${body}`)
    .digest("base64");
  return `v1,${mac}`;
}

function verify(
  overrides: {
    body?: string;
    timestamp?: number;
    signature?: string;
    secret?: string;
    now?: number;
  } = {},
) {
  const timestamp = overrides.timestamp ?? NOW;
  const body = overrides.body ?? BODY;
  return verifyWebhookSignature({
    secret: overrides.secret ?? SECRET,
    headers: {
      id: ID,
      timestamp: String(timestamp),
      signature: overrides.signature ?? sign(body, timestamp),
    },
    rawBody: body,
    nowSeconds: overrides.now ?? NOW,
  });
}

describe("投递回调验签", () => {
  it("签名正确即通过", () => {
    expect(verify()).toEqual({ ok: true });
  });

  it("请求体被改过就不通过", () => {
    /*
     * 这条是这个文件存在的理由：验签形同虚设的话，任何人都能把任意一封信标成
     * bounced，进而让 newsletter 把一个正常订阅者永久停发。
     */
    const signature = sign(BODY, NOW);
    expect(
      verify({ body: '{"type":"email.bounced","data":{}}', signature }),
    ).toEqual({
      ok: false,
      reason: "mismatch",
    });
  });

  it("换个密钥签的也不通过", () => {
    const other = `whsec_${Buffer.from("another-key").toString("base64")}`;
    expect(verify({ signature: sign(BODY, NOW, other) })).toEqual({
      ok: false,
      reason: "mismatch",
    });
  });

  it("时间戳超出容差直接拒（挡重放）", () => {
    // 抓到一次合法回调就能无限重放的话，签名本身就没有意义了
    expect(verify({ now: NOW + 6 * 60 })).toEqual({
      ok: false,
      reason: "stale",
    });
    expect(verify({ now: NOW - 6 * 60 })).toEqual({
      ok: false,
      reason: "stale",
    });
  });

  it("容差之内仍然通过", () => {
    expect(verify({ now: NOW + 4 * 60 })).toEqual({ ok: true });
  });

  it("多个版本的签名，任意一个对上即可（密钥轮换期）", () => {
    const good = sign(BODY, NOW);
    expect(verify({ signature: `v1,AAAA ${good}` })).toEqual({ ok: true });
  });

  it.each([
    ["缺 id", { id: undefined }],
    ["缺时间戳", { timestamp: undefined }],
    ["缺签名", { signature: undefined }],
  ])("%s 一律拒", (_name, headers) => {
    const result = verifyWebhookSignature({
      secret: SECRET,
      headers: {
        id: ID,
        timestamp: String(NOW),
        signature: sign(BODY, NOW),
        ...headers,
      },
      rawBody: BODY,
      nowSeconds: NOW,
    });
    expect(result.ok).toBe(false);
  });

  it("没配密钥时**不放行**，而是判 unconfigured", () => {
    // 「没配就放行」是最糟的失效方向：等于把回调口彻底敞开
    expect(verify({ secret: "  " })).toEqual({
      ok: false,
      reason: "unconfigured",
    });
  });

  it("认不出版本前缀的签名头也拒", () => {
    expect(verify({ signature: "sha256=deadbeef" })).toEqual({
      ok: false,
      reason: "missing",
    });
  });
});

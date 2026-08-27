/**
 * 事件详情页的文章插图 —— 地址的规范化、去噪与代理寻址。两端共用。
 *
 * 三条硬约束（见 `features/event-article-image.spec.yaml`）：
 *   1. 必须署名 + 回链。不能署名的图不画。
 *   2. 默认热链出版方自己的地址，不落盘——文件仍由他们托管分发，
 *      换掉或删掉就等于撤回。代理只在热链裂图时兜底。
 *   3. 库里存的是 URL，不是二进制。
 */

/**
 * 同一来源下同一张图出现到几次就判定它是**站点模板图**而不是文章配图。
 *
 * 这是这套东西能不能看的关键：实测语料里一大半 `og:image` 是站点品牌图，
 * OpenAI Blog 的十条事件共用一张——画出来比不画更糟，读者会以为页面串了。
 * 阈值取 3 而不是 2：同一篇文章被源改稿后重新出现是正常的，两条还不足以定性。
 */
export const ARTICLE_IMAGE_REPEAT_MAX = 3;

/**
 * 明确指向本机 / 内网 / 云元数据的字面地址。
 *
 * 图的代理是**公开无鉴权**的端点：一个内网地址只要进了 `image_url`，任何访客
 * 都能让服务端去拉它并把内容原样拿回去。采集那条出站链路是管理员触发的、
 * 也不回传响应体，这一条不是——所以闸门必须在这里，不能只靠「我们采过它」。
 *
 * **不是完整防护**：主机名解析到私网（DNS rebinding、内网 CNAME）挡不住，
 * 那需要「解析→校验→钉住 IP 再连」。这里挡的是字面量那一类，也就是实际会
 * 从别人 `og:image` 里抄进来的那一类。真要收紧得改 `server/ingest/http.ts` 的出站层。
 */
function isBlockedImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/gu, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host === "0.0.0.0") return true;
  // IPv4 字面量：回环、私网三段、链路本地（含 169.254.169.254 云元数据）
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/u.exec(host);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
  }
  // IPv6 唯一本地 / 链路本地
  if (/^f[cd][0-9a-f]{2}:/u.test(host) || /^fe80:/u.test(host)) return true;
  return false;
}

/**
 * 收下来的地址必须是 http(s)、不指向内网、且看起来是张图。
 *
 * 扩展名不是充分条件（CDN 上大量图片没有扩展名，`/image/upload/v123/abc` 这种），
 * 所以只用它来**排除**明确不是图的东西——播客源的 enclosure 是 mp3，
 * 有些源会把视频塞进 media:content。data: 一律不收：那是内联的副本，
 * 与「热链他们自己托管的文件」正相反。
 */
export function isUsableImageUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }
  if (isBlockedImageHost(parsed.hostname)) {
    return false;
  }
  return !/\.(mp3|mp4|m4a|mov|avi|webm|pdf|zip|json|xml|html?)$/iu.test(
    parsed.pathname,
  );
}

/**
 * 相对地址补成绝对（有些源的 `og:image` 写的是 `/img/hero.png`）。
 * 补不出来就丢掉——半个地址在页面上就是一张裂图。
 */
export function absoluteImageUrl(
  value: string | null | undefined,
  pageUrl: string,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const resolved = new URL(trimmed, pageUrl).toString();
    return isUsableImageUrl(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

/*
 * base64url 用 Web 标准 API 实现，**不用 `Buffer`**：本文件是两端共用的，
 * `Buffer` 只在 Node 里有，浏览器侧走到就是 ReferenceError（`apps/client`
 * 的 typecheck 也会因为找不到它而红）。`btoa`/`atob` 两端都有。
 *
 * 与 `Buffer.from(x).toString("base64url")` 字节等价（含非 ASCII 与无填充），
 * 所以存量 token 继续解得开。
 */
function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(token: string): Uint8Array {
  const binary = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** 代理地址的 token = 原地址的 base64url。路由再反查「这条我们真的采过」。 */
export function encodeImageToken(url: string): string {
  return toBase64Url(new TextEncoder().encode(url));
}

export function decodeImageToken(token: string): string | null {
  try {
    const url = new TextDecoder().decode(fromBase64Url(token));
    return isUsableImageUrl(url) ? url : null;
  } catch {
    return null;
  }
}

/** 公开面代理路径。与 `/events/icons/:host` 同一条 path handler 分派。 */
export function articleImageProxyPath(url: string): string {
  return `/events/images/${encodeImageToken(url)}`;
}

/** 详情页要画的那张图。`null` = 这条事件没有可署名的图，整块不画。 */
export interface PublicArticleImage {
  /** 出版方自己的地址，`<img src>` 直接指向它 */
  url: string;
  /** 热链裂图时的回落地址（本站代理） */
  fallback_url: string;
  /**
   * 已落成当前语言的署名（「图：Reuters」）。段渲染器是同步的、拿不到 i18n，
   * 所以文案在建视图那一步就解析好——与时间线的 `label` 同一条口径。
   * **没有它就不画图**：不能署名的图不该出现。
   */
  credit: string;
  /** 点击回到的原文地址 */
  source_href: string;
}

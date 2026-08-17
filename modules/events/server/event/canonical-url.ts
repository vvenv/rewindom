/**
 * URL 规范化——跨源合并同一篇原文的第一道，也是最可靠的一道依据。
 *
 * 同一篇官方公告经 HN、RSS、转发各走一圈后会带上完全不同的 utm / ref 尾巴，
 * 不规范化就会被当成三件事。这一步纯字符串处理，不发请求（不跟随短链跳转）。
 */

/** 只做追踪用途、去掉不影响页面内容的参数。 */
const TRACKING_PARAM_PREFIXES = ["utm_", "mc_", "pk_", "hsa_", "at_"];
const TRACKING_PARAMS = new Set([
  "ref",
  "ref_src",
  "ref_url",
  "referrer",
  "source",
  "src",
  "fbclid",
  "gclid",
  "igshid",
  "spm",
  "from",
  "share_id",
  "cmpid",
  "smid",
]);

export function canonicalizeUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    // 解析不了就原样返回：宁可少合并一次，也不要伪造一个看起来合法的 URL
    return rawUrl.trim();
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return rawUrl.trim();
  }

  // http 与 https 是同一篇文章；统一到 https 才能合并
  url.protocol = "https:";
  url.hash = "";
  url.username = "";
  url.password = "";
  url.host = url.host.toLowerCase().replace(/^www\./u, "");

  for (const key of [...url.searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (
      TRACKING_PARAMS.has(lower) ||
      TRACKING_PARAM_PREFIXES.some((prefix) => lower.startsWith(prefix))
    ) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();

  // 末尾斜杠不改变内容，但会让两条 URL 不相等
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/u, "");
  }

  const query = url.searchParams.toString();
  return `https://${url.host}${url.pathname}${query ? `?${query}` : ""}`;
}

/** 取域名（去 www），用作来源展示名的兜底。 */
export function hostOf(rawUrl: string): string {
  try {
    return new URL(rawUrl).host.toLowerCase().replace(/^www\./u, "");
  } catch {
    return "";
  }
}

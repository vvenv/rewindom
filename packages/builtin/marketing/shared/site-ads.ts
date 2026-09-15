/**
 * 站点广告 —— 公开面的 Google AdSense Auto ads。
 *
 * 收的是**发布商 ID**，不是任意 HTML：租户在设置里粘一段 `<script>` 等于给自己开
 * 一个脚本注入位。读入口抽出 `ca-pub-…`，按官方 snippet 拼。
 *
 * 与 `analytics` 一样落在一个 JSON 列上，**不进草稿 / 发布链**：广告是站点配置
 * 不是内容，配完就该生效。
 */

import { APP_LOCALES } from "@rewindom/shared";

export interface SiteAds {
  google_adsense_publisher_id: string;
}

export const EMPTY_SITE_ADS: SiteAds = { google_adsense_publisher_id: "" };

export const GOOGLE_ADSENSE_SCRIPT_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

/**
 * Google 在 ads.txt 里的认证机构 ID。所有 AdSense 发布商都用这一条，
 * 见 https://support.google.com/adsense/answer/7532444
 */
export const GOOGLE_ADSENSE_CERT_AUTHORITY_ID = "f08c47fec0942fa0";

export function extractGoogleAdsensePublisherId(raw: string): string {
  const caPub = raw.trim().match(/ca-pub-\d{10,20}/iu);
  if (caPub) return caPub[0].toLowerCase();
  const pubOnly = raw.trim().match(/(?:^|[^a-z0-9-])pub-(\d{10,20})(?:\D|$)/iu);
  if (pubOnly?.[1]) return `ca-pub-${pubOnly[1]}`;
  return "";
}

export function adsTxtSellerId(publisherId: string): string {
  const id = extractGoogleAdsensePublisherId(publisherId);
  return id.replace(/^ca-/u, "");
}

/**
 * Google 要求隐私 / Cookie 披露页不挂广告标签，也不出 Funding Choices 同意窗。
 * 只认去掉 locale 前缀后的**第一段**（`/privacy`、`/en/cookies`），嵌套路径不算。
 */
const SITE_ADS_EXEMPT_SLUGS = new Set([
  "privacy",
  "privacy-policy",
  "cookies",
  "cookie-policy",
]);

const LOCALE_SLUGS = new Set(
  APP_LOCALES.map((locale) => locale.slug.toLowerCase()),
);

export function isSiteAdsExemptPath(path: string): boolean {
  const parts = path.trim().split("/").filter(Boolean);
  if (parts.length === 0) return false;
  const first = parts[0]?.toLowerCase() ?? "";
  const slug = (
    LOCALE_SLUGS.has(first) ? (parts[1] ?? "") : (parts[0] ?? "")
  ).toLowerCase();
  return SITE_ADS_EXEMPT_SLUGS.has(slug);
}

function parseAds(raw: unknown): SiteAds {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_SITE_ADS };
  }
  const rec = raw as Record<string, unknown>;
  return {
    google_adsense_publisher_id:
      typeof rec.google_adsense_publisher_id === "string"
        ? rec.google_adsense_publisher_id.trim()
        : "",
  };
}

/**
 * 读库：脏数据退回「没配」。不完整的条目仍留给编辑器改，写入时再丢掉。
 */
export function parseSiteAds(value: unknown): SiteAds {
  return parseAds(value);
}

/** 空 = 关掉；非空必须抽得出合法 ca-pub，否则提交前拦住。 */
export function isSiteAdsReady(value: SiteAds): boolean {
  const raw = value.google_adsense_publisher_id.trim();
  if (raw === "") return true;
  return extractGoogleAdsensePublisherId(raw) !== "";
}

/**
 * 写库前的归一：抽不出合法 ID 就当成没配，不把整站设置打回失败。
 */
export function normalizeSiteAds(input: unknown): SiteAds {
  const parsed = parseSiteAds(input);
  return {
    google_adsense_publisher_id: extractGoogleAdsensePublisherId(
      parsed.google_adsense_publisher_id,
    ),
  };
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

/**
 * `<head>` 里的 Auto ads snippet；没配时是空串。
 *
 * 归一在写入时已经做过一遍，这里**再兜一次**：存量脏数据不该因为一次读取
 * 就变成页面上的 XSS。
 */
export function renderSiteAdsHtml(input: unknown): string {
  const publisherId = normalizeSiteAds(input).google_adsense_publisher_id;
  if (publisherId === "") return "";
  const id = escapeAttr(publisherId);
  const src = escapeAttr(
    `${GOOGLE_ADSENSE_SCRIPT_SRC}?client=${encodeURIComponent(publisherId)}`,
  );
  return `<meta name="google-adsense-account" content="${id}" />\n<script async src="${src}" crossorigin="anonymous"></script>`;
}

/**
 * `/ads.txt` 正文。没配时是空串——路由据此 404，不要发一份空文件。
 */
export function renderSiteAdsTxt(input: unknown): string {
  const seller = adsTxtSellerId(
    normalizeSiteAds(input).google_adsense_publisher_id,
  );
  if (seller === "") return "";
  return `google.com, ${seller}, DIRECT, ${GOOGLE_ADSENSE_CERT_AUTHORITY_ID}\n`;
}

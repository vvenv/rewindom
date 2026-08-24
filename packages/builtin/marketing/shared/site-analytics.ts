/**
 * 站点访问分析 —— 公开面第三方统计脚本。
 *
 * 收的是**若干条「供应商 + 标识（+ 可选脚本地址）」**，不是任意 HTML：租户在设置
 * 里粘一段 `<script>` 等于给自己开一个脚本注入位，出了问题谁也说不清页面上跑的
 * 是什么。供应商决定 snippet 形状，marketing 只按固定形状拼。
 *
 * 与 `theme_settings` 一样落在一个 JSON 列上，但**不进草稿 / 发布链**：分析是站点
 * 配置不是内容，配完就该生效。
 *
 * 存量曾是单个 `{ provider, script_url, site_id }`；读入口一次性升级成
 * `{ scripts: [...] }`，新写入不再写回旧形状。
 */

export const SITE_ANALYTICS_PROVIDERS = [
  "google_analytics",
  "google_tag_manager",
  "microsoft_clarity",
  "plausible",
  "umami",
  "cloudflare",
  "custom",
] as const;

export type SiteAnalyticsProvider = (typeof SITE_ANALYTICS_PROVIDERS)[number];

export interface SiteAnalyticsScript {
  provider: SiteAnalyticsProvider;
  /** 脚本地址；有官方默认地址的供应商留空即用默认。GA / GTM / Clarity 忽略此字段。 */
  script_url: string;
  /**
   * plausible 的域名 / umami 的 website id / cloudflare 的 beacon token /
   * GA 的 Measurement ID（G-…）/ GTM 的容器 ID（GTM-…）/ Clarity 的项目 ID；
   * custom 用不到。
   */
  site_id: string;
}

export interface SiteAnalytics {
  scripts: SiteAnalyticsScript[];
}

export const MAX_SITE_ANALYTICS_SCRIPTS = 8;

/** Plausible SaaS 的默认脚本；自托管时租户自己填 `script_url`。 */
export const PLAUSIBLE_DEFAULT_SCRIPT = "https://plausible.io/js/script.js";

/** Cloudflare Web Analytics 的官方 beacon；没有自托管这一说。 */
export const CLOUDFLARE_DEFAULT_SCRIPT =
  "https://static.cloudflareinsights.com/beacon.min.js";

const DEFAULT_SCRIPT_BY_PROVIDER: Partial<
  Record<SiteAnalyticsProvider, string>
> = {
  plausible: PLAUSIBLE_DEFAULT_SCRIPT,
  cloudflare: CLOUDFLARE_DEFAULT_SCRIPT,
};

const LEGACY_NONE = "none";

export function defaultAnalyticsScriptUrl(
  provider: SiteAnalyticsProvider,
): string | undefined {
  return DEFAULT_SCRIPT_BY_PROVIDER[provider];
}

export const EMPTY_SITE_ANALYTICS: SiteAnalytics = { scripts: [] };

export function emptyAnalyticsScript(
  provider: SiteAnalyticsProvider,
): SiteAnalyticsScript {
  return { provider, script_url: "", site_id: "" };
}

function isProvider(value: unknown): value is SiteAnalyticsProvider {
  return (
    typeof value === "string" &&
    (SITE_ANALYTICS_PROVIDERS as readonly string[]).includes(value)
  );
}

/** 内联 JS / URL 路径里只允许这一类字符，挡住引号与标签。 */
export function isSafeAnalyticsToken(value: string): boolean {
  return /^[A-Za-z0-9._-]+$/u.test(value) && value.length <= 128;
}

export function analyticsScriptNeedsSiteId(
  provider: SiteAnalyticsProvider,
): boolean {
  return provider !== "custom";
}

export function analyticsScriptNeedsUrl(
  provider: SiteAnalyticsProvider,
): boolean {
  return (
    provider === "plausible" ||
    provider === "umami" ||
    provider === "cloudflare" ||
    provider === "custom"
  );
}

/**
 * 脚本地址必须是 **https 绝对地址**。
 *
 * 相对路径进不来（分析脚本天然是第三方），`http:` 会在 https 页面上被浏览器拦掉，
 * `javascript:` 更是直接的注入面。三者一律当没填。
 */
export function isAllowedAnalyticsScript(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return false;
  try {
    return new URL(trimmed).protocol === "https:";
  } catch {
    return false;
  }
}

export function extractGoogleAnalyticsId(raw: string): string {
  const match = raw.trim().match(/G-[A-Z0-9]+/iu);
  return match ? match[0].toUpperCase() : "";
}

export function extractGoogleTagManagerId(raw: string): string {
  const match = raw.trim().match(/GTM-[A-Z0-9]+/iu);
  return match ? match[0].toUpperCase() : "";
}

function parseScript(raw: unknown): SiteAnalyticsScript | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  if (!isProvider(rec.provider)) return null;
  return {
    provider: rec.provider,
    script_url: typeof rec.script_url === "string" ? rec.script_url.trim() : "",
    site_id: typeof rec.site_id === "string" ? rec.site_id.trim() : "",
  };
}

function isLegacySingle(raw: Record<string, unknown>): boolean {
  return !("scripts" in raw) && typeof raw.provider === "string";
}

/**
 * 读库：脏数据退回「没配」；旧的单对象形状升级成 `{ scripts }`。
 * 不完整的条目仍留给编辑器改，写入时再丢掉。
 */
export function parseSiteAnalytics(value: unknown): SiteAnalytics {
  if (!value || typeof value !== "object") return { ...EMPTY_SITE_ANALYTICS };
  const raw = value as Record<string, unknown>;

  if (isLegacySingle(raw)) {
    if (raw.provider === LEGACY_NONE) return { ...EMPTY_SITE_ANALYTICS };
    const script = parseScript(raw);
    return script ? { scripts: [script] } : { ...EMPTY_SITE_ANALYTICS };
  }

  if (!Array.isArray(raw.scripts)) return { ...EMPTY_SITE_ANALYTICS };
  const scripts: SiteAnalyticsScript[] = [];
  for (const item of raw.scripts) {
    if (scripts.length >= MAX_SITE_ANALYTICS_SCRIPTS) break;
    const script = parseScript(item);
    if (script) scripts.push(script);
  }
  return { scripts };
}

function resolvedScriptUrl(script: SiteAnalyticsScript): string {
  if (!analyticsScriptNeedsUrl(script.provider)) return "";
  if (script.script_url === "") {
    return defaultAnalyticsScriptUrl(script.provider) ?? "";
  }
  return script.script_url;
}

function resolvedSiteId(script: SiteAnalyticsScript): string {
  if (script.provider === "google_analytics") {
    return extractGoogleAnalyticsId(script.site_id);
  }
  if (script.provider === "google_tag_manager") {
    return extractGoogleTagManagerId(script.site_id);
  }
  return script.site_id.trim();
}

/** 这一条配没配完：编辑器提交前拦住，避免服务端悄悄丢掉。 */
export function isCompleteAnalyticsScript(script: SiteAnalyticsScript): boolean {
  if (analyticsScriptNeedsSiteId(script.provider)) {
    const siteId = resolvedSiteId(script);
    if (siteId === "" || !isSafeAnalyticsToken(siteId)) return false;
  }
  if (analyticsScriptNeedsUrl(script.provider)) {
    return isAllowedAnalyticsScript(resolvedScriptUrl(script));
  }
  return true;
}

export function isSiteAnalyticsReady(value: SiteAnalytics): boolean {
  return value.scripts.every(isCompleteAnalyticsScript);
}

/**
 * 写库前的归一：非法 / 不完整的条目丢掉，不把整站设置打回失败。
 */
export function normalizeSiteAnalytics(input: unknown): SiteAnalytics {
  const parsed = parseSiteAnalytics(input);
  const scripts: SiteAnalyticsScript[] = [];
  for (const script of parsed.scripts) {
    if (scripts.length >= MAX_SITE_ANALYTICS_SCRIPTS) break;
    if (!isCompleteAnalyticsScript(script)) continue;
    scripts.push({
      provider: script.provider,
      script_url: resolvedScriptUrl(script),
      site_id: resolvedSiteId(script),
    });
  }
  return { scripts };
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

function jsString(value: string): string {
  return JSON.stringify(value);
}

interface RenderedAnalytics {
  head: string;
  body: string;
}

function renderOne(script: SiteAnalyticsScript): RenderedAnalytics {
  const siteId = resolvedSiteId(script);
  if (script.provider === "google_analytics") {
    const src = escapeAttr(
      `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(siteId)}`,
    );
    const id = jsString(siteId);
    return {
      head: `<script async src="${src}"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config",${id});</script>`,
      body: "",
    };
  }
  if (script.provider === "google_tag_manager") {
    const id = jsString(siteId);
    const iframeSrc = escapeAttr(
      `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(siteId)}`,
    );
    return {
      head: `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({"gtm.start":new Date().getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!="dataLayer"?"&l="+l:"";j.async=true;j.src="https://www.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f);})(window,document,"script","dataLayer",${id});</script>`,
      body: `<noscript><iframe src="${iframeSrc}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`,
    };
  }
  if (script.provider === "microsoft_clarity") {
    const id = jsString(siteId);
    return {
      head: `<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${id});</script>`,
      body: "",
    };
  }

  const src = escapeAttr(resolvedScriptUrl(script));
  const id = escapeAttr(siteId);
  if (script.provider === "plausible") {
    return {
      head: `<script defer data-domain="${id}" src="${src}"></script>`,
      body: "",
    };
  }
  if (script.provider === "umami") {
    return {
      head: `<script defer data-website-id="${id}" src="${src}"></script>`,
      body: "",
    };
  }
  if (script.provider === "cloudflare") {
    const beacon = escapeAttr(JSON.stringify({ token: siteId }));
    return {
      head: `<script type="module" src="${src}" data-cf-beacon="${beacon}"></script>`,
      body: "",
    };
  }
  return {
    head: `<script defer src="${src}"></script>`,
    body: "",
  };
}

function renderParts(input: unknown): RenderedAnalytics {
  const analytics = normalizeSiteAnalytics(input);
  const heads: string[] = [];
  const bodies: string[] = [];
  for (const script of analytics.scripts) {
    const rendered = renderOne(script);
    if (rendered.head) heads.push(rendered.head);
    if (rendered.body) bodies.push(rendered.body);
  }
  return { head: heads.join("\n"), body: bodies.join("\n") };
}

/**
 * `<head>` 里的脚本；没配（或配得不合法）时是空串。
 *
 * 归一在写入时已经做过一遍，这里**再兜一次**：存量脏数据不该因为一次读取
 * 就变成页面上的 XSS。
 */
export function renderSiteAnalyticsHtml(input: unknown): string {
  return renderParts(input).head;
}

/** GTM 的 `<noscript>` iframe，紧挨 `<body>` 开头。 */
export function renderSiteAnalyticsBodyHtml(input: unknown): string {
  return renderParts(input).body;
}

/**
 * 站点访问分析 —— 公开面 `<head>` 里那一行第三方脚本。
 *
 * 收的是**一个脚本地址 + 一个站点标识**，不是任意 HTML：租户在设置里粘一段
 * `<script>` 等于给自己开一个脚本注入位，出了问题谁也说不清页面上跑的是什么。
 * 供应商决定属性名，marketing 只按固定形状拼。
 *
 * 与 `theme_settings` 一样落在一个 JSON 列上（形状还会长），但**不进草稿 / 发布链**：
 * 分析是站点配置不是内容，配完就该生效。
 */

/**
 * 支持的供应商。
 *
 * 只收不写 cookie、不做跨站跟踪的那一类——它们不需要同意横幅。GA 这种要先弹
 * 隐私弹窗的不在列：那是一整套同意管理，不是「填个 id」。Cloudflare Web
 * Analytics 属于这一类（beacon + token），所以是一等选项而不是 `custom`。
 * `custom` 是自托管兜底：只发 src，属性由脚本自己认。
 */
export const SITE_ANALYTICS_PROVIDERS = [
  "none",
  "plausible",
  "umami",
  "cloudflare",
  "custom",
] as const;

export type SiteAnalyticsProvider = (typeof SITE_ANALYTICS_PROVIDERS)[number];

export interface SiteAnalytics {
  provider: SiteAnalyticsProvider;
  /** 脚本地址；有官方默认地址的供应商留空即用默认。 */
  script_url: string;
  /**
   * plausible 的 `data-domain` / umami 的 `data-website-id` /
   * cloudflare 的 beacon token；custom 用不到。
   */
  site_id: string;
}

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

export function defaultAnalyticsScriptUrl(
  provider: SiteAnalyticsProvider,
): string | undefined {
  return DEFAULT_SCRIPT_BY_PROVIDER[provider];
}

export const EMPTY_SITE_ANALYTICS: SiteAnalytics = {
  provider: "none",
  script_url: "",
  site_id: "",
};

function isProvider(value: unknown): value is SiteAnalyticsProvider {
  return (
    typeof value === "string" &&
    (SITE_ANALYTICS_PROVIDERS as readonly string[]).includes(value)
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

/** 读库：脏数据 / 老形状一律退回「没配」，不抛。 */
export function parseSiteAnalytics(value: unknown): SiteAnalytics {
  if (!value || typeof value !== "object") return { ...EMPTY_SITE_ANALYTICS };
  const raw = value as Record<string, unknown>;
  return {
    provider: isProvider(raw.provider) ? raw.provider : "none",
    script_url: typeof raw.script_url === "string" ? raw.script_url.trim() : "",
    site_id: typeof raw.site_id === "string" ? raw.site_id.trim() : "",
  };
}

/**
 * 写库前的归一：非法输入**不抛**，退成「没配」。
 *
 * 理由与 `parseSiteAnalytics` 一致：这是一个可以随时关掉的开关，
 * 填错的代价应该是「统计没生效」，而不是整个站点设置存不下去。
 */
export function normalizeSiteAnalytics(input: unknown): SiteAnalytics {
  const parsed = parseSiteAnalytics(input);
  if (parsed.provider === "none") return { ...EMPTY_SITE_ANALYTICS };

  const script =
    parsed.script_url === ""
      ? (defaultAnalyticsScriptUrl(parsed.provider) ?? "")
      : parsed.script_url;
  if (!isAllowedAnalyticsScript(script)) return { ...EMPTY_SITE_ANALYTICS };

  // 除 custom 外都靠 site_id 认站点：没有它脚本会往上游发一串无归属的请求
  if (parsed.provider !== "custom" && parsed.site_id === "") {
    return { ...EMPTY_SITE_ANALYTICS };
  }
  return { provider: parsed.provider, script_url: script, site_id: parsed.site_id };
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

/**
 * `<head>` 里那一行脚本；没配（或配得不合法）时是空串。
 *
 * 归一在写入时已经做过一遍，这里**再兜一次**：存量脏数据不该因为一次读取
 * 就变成页面上的 XSS。
 */
export function renderSiteAnalyticsHtml(input: unknown): string {
  const analytics = normalizeSiteAnalytics(input);
  if (analytics.provider === "none") return "";
  const src = escapeAttr(analytics.script_url);
  const id = escapeAttr(analytics.site_id);
  if (analytics.provider === "plausible") {
    return `<script defer data-domain="${id}" src="${src}"></script>`;
  }
  if (analytics.provider === "umami") {
    return `<script defer data-website-id="${id}" src="${src}"></script>`;
  }
  if (analytics.provider === "cloudflare") {
    // 官方 snippet 是 ES module；`defer` 不够，beacon 不会跑。
    // token 先 JSON 再当属性转义：值里的引号既不能破 HTML 也不能破 JSON。
    const beacon = escapeAttr(JSON.stringify({ token: analytics.site_id }));
    return `<script type="module" src="${src}" data-cf-beacon="${beacon}"></script>`;
  }
  return `<script defer src="${src}"></script>`;
}

/**
 * 租户官网的 locale 路由规则（SSR / SPA / sitemap / 编辑器共用）。
 *
 * 租户 CMS 路径是自助建出来的，不能靠白名单认页面；只能反过来排除应用区 / API 前缀。
 *
 * URL 形态对齐 Shopify Markets：站点默认语言**不带前缀**（SEO 主入口），
 * 其余语言走 `/{locale}/...` 子目录。
 */

import {
  APP_LOCALES,
  isAppLocale,
  normalizeLocale,
  type AppLocale,
} from "@rewindom/shared";

import {
  SITE_APP_PREFIXES,
  SITE_SSR_EXCEPTION_PATHS,
  SITE_SSR_PREFIX_EXCEPTIONS,
  normalizeSitePath,
} from "./site-app-prefixes.js";

export {
  SITE_APP_PREFIXES,
  SITE_SSR_EXCEPTION_PATHS,
  SITE_SSR_PREFIX_EXCEPTIONS,
  isSiteSsrExceptionPath,
  isSpaShellPath,
  normalizeSitePath,
} from "./site-app-prefixes.js";

const APP_PREFIX_SET = new Set<string>(SITE_APP_PREFIXES);

/**
 * 应用区前缀下、但仍可带 locale 的路径（店面 `/shop/:slug` 等）。
 *
 * marketing 不认识业务模块的路由形状；模块在装载时把「带前缀也能打开」的
 * matcher 登记进来。`/shop` 本身已在 `SITE_SSR_PREFIX_EXCEPTIONS` 里，不必再登。
 */
const LOCALIZABLE_APP_HREF_MATCHERS: Array<(path: string) => boolean> = [];

export function registerLocalizableAppHref(
  match: (path: string) => boolean,
): void {
  if (LOCALIZABLE_APP_HREF_MATCHERS.includes(match)) return;
  LOCALIZABLE_APP_HREF_MATCHERS.push(match);
}

/** 仅供测试。 */
export function resetLocalizableAppHrefs(): void {
  LOCALIZABLE_APP_HREF_MATCHERS.length = 0;
}

/** 大小写不敏感地把一段路径解析成 locale（`zh-cn` → `zh-CN`）。 */
export function resolveLocaleSegment(segment: string): AppLocale | null {
  if (isAppLocale(segment)) return segment;
  const lower = segment.toLowerCase();
  return (
    APP_LOCALES.find((locale) => locale.slug.toLowerCase() === lower)?.slug ??
    null
  );
}

/** 站点可选语言：始终以 `APP_LOCALES` 为准，站点默认语言排在最前。 */
export function siteLocaleOrder(defaultLocale: AppLocale): AppLocale[] {
  return [
    defaultLocale,
    ...APP_LOCALES.map((item) => item.slug).filter(
      (slug) => slug !== defaultLocale,
    ),
  ];
}

export interface ParsedSiteLocalePath {
  /** URL 或站点默认语言解析出的 locale。 */
  locale: AppLocale;
  /** 去掉 locale 前缀后的逻辑路径（`/`、`/about`、`/docs/x`）。 */
  path: string;
  /** 路径是否显式带了 `/{locale}` 前缀。 */
  prefixed: boolean;
}

/**
 * 拆出租户官网路径上的 locale 前缀。
 *
 * - `/en/about` + 默认 `zh-CN` → `{ locale: "en", path: "/about", prefixed: true }`
 * - `/about` + 默认 `zh-CN` → `{ locale: "zh-CN", path: "/about", prefixed: false }`
 */
export function parseSiteLocalePath(
  pathname: string,
  defaultLocale: AppLocale,
): ParsedSiteLocalePath {
  const normalized = normalizeSitePath(pathname);
  if (normalized === "/") {
    return { locale: defaultLocale, path: "/", prefixed: false };
  }

  const segments = normalized.slice(1).split("/");
  const first = segments[0] ?? "";
  const locale = resolveLocaleSegment(first);
  if (locale) {
    const rest = segments.slice(1);
    return {
      locale,
      path: rest.length === 0 ? "/" : `/${rest.join("/")}`,
      prefixed: true,
    };
  }

  return { locale: defaultLocale, path: normalized, prefixed: false };
}

/**
 * Marketing SSR 入口把 URL 拆成「逻辑路径 + 可选语言」。
 *
 * 与 `parseSiteLocalePath` 的差别：没有站点默认语言时，无前缀地址的 locale 是
 * `null`（交给后面 `resolvePageLocale(requested, site.default_locale)` 填），
 * 而不是猜一个默认值。末尾斜杠在这里就剥掉，这样 `/old/` 与 `/old` 走进同一条
 * 渲染 / 重定向查找。
 */
export function parseMarketingSsrPath(pathname: string): {
  logicalPath: string;
  locale: AppLocale | null;
} {
  const normalized = normalizeSitePath(pathname.split(/[?#]/u)[0] ?? pathname);
  if (normalized === "/") {
    return { logicalPath: "/", locale: null };
  }
  const segments = normalized.slice(1).split("/");
  const locale = resolveLocaleSegment(segments[0] ?? "");
  if (!locale) {
    return { logicalPath: normalized, locale: null };
  }
  const rest = segments.slice(1);
  return {
    locale,
    logicalPath: rest.length === 0 ? "/" : `/${rest.join("/")}`,
  };
}

/**
 * URL 上的语言（可空）→ 这一页真正渲染的语言。
 *
 * 无前缀 = 站点主语言。不要写成 `normalizeLocale(locale)`：那会掉到代码兜底
 * `zh-CN`，站点主语言改成 `en` 之后 `/` 仍整页中文。
 *
 * 重定向的 Location 仍用 URL 上的值（`null` = 不带前缀），不要把这里的结果
 * 传给 `localizeRedirectLocation`。
 */
export function resolvePageLocale(
  requested: AppLocale | null | undefined,
  defaultLocale: AppLocale,
): AppLocale {
  return normalizeLocale(requested, defaultLocale);
}

/**
 * 逻辑路径 → 该语言下的实际 URL。
 *
 * 站点默认语言不带前缀，避免同一份内容出现 `/about` 与 `/zh-CN/about` 两个入口。
 */
export function withSiteLocale(
  logicalPath: string,
  locale: AppLocale,
  defaultLocale: AppLocale,
): string {
  const path = normalizeSitePath(logicalPath);
  if (locale === defaultLocale) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/**
 * 当前路径是否由租户官网 CMS 承接（相对 `/app`、`/login` 等应用区而言）。
 * 用于决定首屏注入 `MARKETING_SITE_CSS` 还是工作台 `index.css`。
 */
export function isMarketingPublicPath(pathname: string): boolean {
  const normalized = normalizeSitePath(pathname);
  if (normalized === "/") return true;
  const segments = normalized.slice(1).split("/");
  const first = segments[0] ?? "";
  if (APP_PREFIX_SET.has(first)) return false;
  const locale = resolveLocaleSegment(first);
  if (locale) {
    const second = segments[1] ?? "";
    if (!second) return true;
    return !APP_PREFIX_SET.has(second);
  }
  return true;
}

/** 站内、且属于官网内容的链接才加 locale 前缀。 */
export function isSiteLocalizableHref(href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  const path = href.split(/[?#]/u)[0] ?? href;
  const first = path.slice(1).split("/")[0] ?? "";
  // 已经带了 locale 前缀的链接原样放行，不做二次前缀
  if (resolveLocaleSegment(first) !== null) return false;
  if (!APP_PREFIX_SET.has(first)) return true;
  /*
   * 应用区前缀默认不加。例外是 marketing SSR 接得住的那几条：会员模板页、
   * 店面目录，以及业务模块登记过的「带 locale 也能打开」的子路径
   *（`/shop/mug`）。购物车 / 结账 / 分类仍不扩——更深地址现有路由接不住。
   */
  const normalized = normalizeSitePath(path);
  if (
    (SITE_SSR_EXCEPTION_PATHS as readonly string[]).includes(normalized) ||
    (SITE_SSR_PREFIX_EXCEPTIONS as readonly string[]).includes(normalized)
  ) {
    return true;
  }
  return LOCALIZABLE_APP_HREF_MATCHERS.some((match) => match(normalized));
}

/**
 * 渲染期把租户填的内链改写成当前语言的 URL（保留 query / hash）。
 * 外链、应用区链接原样返回。
 */
export function localizeSiteHref(
  href: string,
  locale: AppLocale,
  defaultLocale: AppLocale,
): string {
  if (!isSiteLocalizableHref(href)) return href;
  const suffixAt = href.search(/[?#]/u);
  const pathPart = suffixAt === -1 ? href : href.slice(0, suffixAt);
  const rest = suffixAt === -1 ? "" : href.slice(suffixAt);
  return withSiteLocale(pathPart, locale, defaultLocale) + rest;
}

/**
 * 渲染期把逻辑路径写成当前语言的 URL。
 *
 * HTML 渲染器应走这里，而不是自己拼 `/{locale}`：缺 locale 时（单测、无
 * Provider）原样返回；已经带前缀或不是官网内容的链接也不会被改写。
 */
export function siteHref(
  href: string,
  ctx: {
    locale?: AppLocale | null;
    defaultLocale?: AppLocale | null;
  },
): string {
  if (!ctx.locale || !ctx.defaultLocale) return href;
  return localizeSiteHref(href, ctx.locale, ctx.defaultLocale);
}

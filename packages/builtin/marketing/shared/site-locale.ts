/**
 * 租户官网的 locale 路由规则（SSR / SPA / sitemap / 编辑器共用）。
 *
 * 租户 CMS 路径是自助建出来的，不能靠白名单认页面；只能反过来排除应用区 / API 前缀。
 *
 * URL 形态对齐 Shopify Markets：站点默认语言**不带前缀**（SEO 主入口），
 * 其余语言走 `/{locale}/...` 子目录。
 */

import { APP_LOCALES, isAppLocale, type AppLocale } from "@rewindom/shared";

import { SITE_APP_PREFIXES, normalizeSitePath } from "./site-app-prefixes.js";

export {
  SITE_APP_PREFIXES,
  SITE_SSR_EXCEPTION_PATHS,
  SITE_SSR_PREFIX_EXCEPTIONS,
  isSiteSsrExceptionPath,
  isSpaShellPath,
  normalizeSitePath,
} from "./site-app-prefixes.js";

const APP_PREFIX_SET = new Set<string>(SITE_APP_PREFIXES);

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
  if (APP_PREFIX_SET.has(first)) return false;
  // 已经带了 locale 前缀的链接原样放行，不做二次前缀
  return resolveLocaleSegment(first) === null;
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

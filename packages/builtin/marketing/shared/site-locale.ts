/**
 * 租户官网的 locale 路由规则（SSR / SPA / sitemap / 编辑器共用）。
 *
 * 租户 CMS 路径是自助建出来的，不能靠白名单认页面；只能反过来排除应用区 / API 前缀。
 *
 * URL 形态对齐 Shopify Markets：站点默认语言**不带前缀**（SEO 主入口），
 * 其余语言走 `/{locale}/...` 子目录。
 */

import { APP_LOCALES, isAppLocale, type AppLocale } from "@be-water/shared";

/**
 * 不属于官网内容、因而不加 locale 前缀的一级路径。
 *
 * 与 `server/ssr.routes.ts` 的 SPA 兜底、`RESERVED_PAGE_SLUGS` 同源：
 * 这三处说的是同一件事——这些一级段不归租户 CMS 管。
 */
export const SITE_APP_PREFIXES = [
  /*
   * 应用区一级路径：这些不是租户 CMS 的页面，SSR 认出后交回 SPA。
   *
   * **租户工作台的路由全部收在 `/app/*` 之下**，所以这里只需要一个 `app`——
   * 新增业务模块不必再回来加一行。以前每个模块各占一个顶层路径（`/notes`、
   * `/site`…），这张表就得跟着长，而它在 nginx location 与 vite dev 代理里
   * 还各有一份副本：`/site`、`/dashboard`、`/audit-logs` 就这么漏掉过，
   * 在绑定域上一直是 404。顺带也把这些顶层 slug 还给了租户站点。
   */
  "app",
  // 工作台登录/注册（GuestOnlyRoute）
  "login",
  "register",
  // 工作台 OAuth 前端落地页（/auth/oauth/callback）；漏掉会被 Marketing SSR 当成 CMS 404
  "auth",
  // 站点会员的登录/注册/我的账户；不加进来 SSR 会把 /member/login 当 CMS 页面找
  "member",
  // 店面 SSR（/shop、/shop/:slug）；nginx / vite 再以 SSR 例外前缀打回 Fastify
  "shop",
  // 平台控制台
  "platform",
  // 非文档路径，由各自的 location / 中间件处理
  "api",
  "assets",
  "health",
] as const;

/**
 * 应用区前缀下的**例外**：这些具体路径由服务端渲染，不交回 SPA。
 *
 * 会员的登录 / 注册 / 我的账户都是租户可排版的模板页（版式在 Theme Editor 里排，
 * 表单由代码渲染），所以它们必须走 Fastify SSR；`/member/*` 下的其余页面
 *（`/member/oauth/callback`）仍是 SPA。
 *
 * 与 `SITE_APP_PREFIXES` 一样，这份表在 nginx location 与 vite dev 代理里各有一份副本，
 * 由 `nginx-spa-prefixes.test.ts` 盯着三处对齐——漏掉一处的后果是登录页在那个环境下
 * 打开的是 SPA 的 404（SPA 上已经没有这几条路由了）。
 *
 * marketing 在这里写死 `/member/...` 是刻意的：`enhance/account.ts` 的登录链、
 * SSR 的不可用页也都写着同一个地址。这是**部署拓扑**，不是模块依赖——运行期的注册表
 * （`page-templates.ts`）进不了 nginx 配置。
 */
export const SITE_SSR_EXCEPTION_PATHS = [
  "/member/login",
  "/member/register",
  "/member/account",
  "/member/billing",
  "/member/orders",
] as const;

/** 整段前缀走 SSR 的例外（店面 `/shop` 与 `/shop/:slug`）。 */
export const SITE_SSR_PREFIX_EXCEPTIONS = ["/shop"] as const;

const APP_PREFIX_SET = new Set<string>(SITE_APP_PREFIXES);
const SSR_EXCEPTION_SET = new Set<string>(SITE_SSR_EXCEPTION_PATHS);

/** 这条路径虽然落在应用区前缀下，但归服务端渲染。 */
export function isSiteSsrExceptionPath(path: string): boolean {
  const normalized = normalizeSitePath(path.split(/[?#]/u)[0] ?? path);
  if (SSR_EXCEPTION_SET.has(normalized)) return true;
  return SITE_SSR_PREFIX_EXCEPTIONS.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
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

function normalizeSitePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  const trimmed = pathname.replace(/\/+$/u, "");
  if (trimmed === "") return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
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

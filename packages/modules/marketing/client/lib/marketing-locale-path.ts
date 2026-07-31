import {
  DEFAULT_LOCALE,
  isAppLocale,
  type AppLocale,
} from "@be-water/shared";

export interface ParsedMarketingLocalePath {
  /** URL 或默认语言解析出的 locale。 */
  locale: AppLocale;
  /** 去掉 locale 前缀后的逻辑路径（`/`、`/pricing`、`/docs/...`）。 */
  path: string;
  /** 路径是否显式带了 `/{locale}` 前缀。 */
  prefixed: boolean;
}

function normalizeLogicalPath(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }
  const trimmed = pathname.replace(/\/+$/u, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/**
 * 解析官网路径上的 locale 前缀。
 *
 * - `/en/pricing` → `{ locale: "en", path: "/pricing", prefixed: true }`
 * - `/pricing` → `{ locale: "zh-CN", path: "/pricing", prefixed: false }`
 * - `/zh-CN` → `{ locale: "zh-CN", path: "/", prefixed: true }`
 */
export function parseMarketingLocalePath(
  pathname: string,
): ParsedMarketingLocalePath {
  const normalized = normalizeLogicalPath(pathname);
  if (normalized === "/") {
    return { locale: DEFAULT_LOCALE, path: "/", prefixed: false };
  }

  const segments = normalized.slice(1).split("/");
  const first = segments[0];
  if (first && isAppLocale(first)) {
    const rest = segments.slice(1);
    return {
      locale: first,
      path: rest.length === 0 ? "/" : `/${rest.join("/")}`,
      prefixed: true,
    };
  }

  return {
    locale: DEFAULT_LOCALE,
    path: normalized,
    prefixed: false,
  };
}

/**
 * 把逻辑路径写成带（或不带）locale 前缀的官网 URL。
 *
 * 默认语言默认不写前缀（SEO 主入口）；`forcePrefix` 用于生成 `/zh-CN/...` 静态页，
 * 或在用户已处于前缀树上时保持前缀导航。
 */
export function withMarketingLocale(
  logicalPath: string,
  locale: AppLocale,
  options?: { forcePrefix?: boolean },
): string {
  const path = normalizeLogicalPath(logicalPath);
  const usePrefix = options?.forcePrefix === true || locale !== DEFAULT_LOCALE;
  if (!usePrefix) {
    return path;
  }
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** 在官网路径上切换语言，保留逻辑路径。 */
export function swapMarketingLocale(
  pathname: string,
  nextLocale: AppLocale,
): string {
  const { path, prefixed } = parseMarketingLocalePath(pathname);
  return withMarketingLocale(path, nextLocale, {
    forcePrefix: prefixed && nextLocale === DEFAULT_LOCALE,
  });
}

/** 是否为官网内容路径（含 locale 前缀形态）。 */
export function isMarketingContentPath(pathname: string): boolean {
  const { path } = parseMarketingLocalePath(pathname);
  return path === "/" || path === "/pricing" || path.startsWith("/docs");
}

/** 导航高亮：按逻辑路径比较，忽略 locale 前缀。 */
export function marketingPathsMatch(
  pathname: string,
  href: string,
): boolean {
  const { path } = parseMarketingLocalePath(pathname);
  const target = normalizeLogicalPath(href);
  return path === target || path.startsWith(`${target}/`);
}

/**
 * 应用区 / 认证页等非官网链接，不应加 locale 前缀。
 */
export function isMarketingLocalizableHref(href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("//")) {
    return false;
  }
  const path = href.split(/[?#]/u)[0] ?? href;
  if (
    path.startsWith("/api") ||
    path.startsWith("/app") ||
    path.startsWith("/platform") ||
    path.startsWith("/settings") ||
    path.startsWith("/login") ||
    path.startsWith("/register")
  ) {
    return false;
  }
  return (
    path === "/" || path === "/pricing" || path === "/docs" || path.startsWith("/docs/")
  );
}

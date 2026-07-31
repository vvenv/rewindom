import { useCallback } from "react";

import { useLocale } from "@be-water/client-kit";
import { useLocation } from "react-router";

import {
  isMarketingContentPath,
  isMarketingLocalizableHref,
  parseMarketingLocalePath,
  withMarketingLocale,
} from "../lib/marketing-locale-path.js";

/**
 * 把官网内链写成当前语言对应的 URL（保留 query/hash）。
 * 登录 / 注册 / 控制台等路径原样返回。
 */
export function useMarketingHref(): (href: string) => string {
  const { pathname } = useLocation();
  const { locale: resolvedLocale } = useLocale();
  const parsed = parseMarketingLocalePath(pathname);
  const locale = isMarketingContentPath(pathname)
    ? parsed.locale
    : resolvedLocale;

  return useCallback(
    (href: string) => {
      if (!isMarketingLocalizableHref(href)) {
        return href;
      }
      const suffixAt = href.search(/[?#]/u);
      const pathPart = suffixAt === -1 ? href : href.slice(0, suffixAt);
      const rest = suffixAt === -1 ? "" : href.slice(suffixAt);
      return (
        withMarketingLocale(pathPart, locale, {
          forcePrefix: parsed.prefixed,
        }) + rest
      );
    },
    [locale, parsed.prefixed],
  );
}

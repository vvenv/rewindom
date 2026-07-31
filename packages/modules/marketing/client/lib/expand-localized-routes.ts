import {
  i18n,
  registerI18nBundles,
  setupI18n,
} from "@be-water/client-kit/i18n/setup";
import { APP_LOCALES, DEFAULT_LOCALE, type AppLocale } from "@be-water/shared";

import {
  buildCanonicalUrl,
  type PageSeo,
} from "../../shared/index.js";

import { MARKETING_I18N } from "../i18n.js";
import { localizePageSeo } from "./marketing-i18n.js";
import { withMarketingLocale } from "./marketing-locale-path.js";
import { MARKETING_ROUTES } from "./seo-routes.js";

registerI18nBundles([MARKETING_I18N]);

function localizeRouteCopy(base: PageSeo, locale: AppLocale): PageSeo {
  setupI18n(locale);
  const t = i18n.getFixedT(locale, "marketing");
  return localizePageSeo(base, t);
}

function remapJsonLdUrls(
  data: Record<string, unknown>,
  origin: string,
  fromPath: string,
  toPath: string,
): Record<string, unknown> {
  if (fromPath === toPath) {
    return data;
  }
  const fromUrl = buildCanonicalUrl(origin, fromPath);
  const toUrl = buildCanonicalUrl(origin, toPath);
  return JSON.parse(
    JSON.stringify(data).split(fromUrl).join(toUrl),
  ) as Record<string, unknown>;
}

/**
 * 展开预渲染 / sitemap 路由：无前缀默认语言 + 各 locale 的 `/{locale}/...`。
 *
 * `MARKETING_ROUTES` 仍是逻辑路径真相源；本函数只在构建期展开。
 */
export function expandLocalizedMarketingRoutes(): PageSeo[] {
  const expanded: PageSeo[] = [];

  for (const base of MARKETING_ROUTES) {
    const defaultCopy = localizeRouteCopy(base, DEFAULT_LOCALE);
    expanded.push({
      ...defaultCopy,
      path: base.path,
      locale: DEFAULT_LOCALE,
      buildJsonLd: base.buildJsonLd,
    });

    for (const { slug: locale } of APP_LOCALES) {
      const localized = localizeRouteCopy(base, locale);
      const path = withMarketingLocale(base.path, locale, {
        forcePrefix: true,
      });
      expanded.push({
        ...localized,
        path,
        locale,
        // 带前缀的默认语言页：canonical 指向无前缀主入口，避免重复收录
        canonical_path: locale === DEFAULT_LOCALE ? base.path : undefined,
        buildJsonLd: base.buildJsonLd
          ? (origin) =>
              remapJsonLdUrls(
                base.buildJsonLd!(origin),
                origin,
                base.path,
                path,
              )
          : undefined,
      });
    }
  }

  return expanded;
}

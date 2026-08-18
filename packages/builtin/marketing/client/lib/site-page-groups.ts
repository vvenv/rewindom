import {
  isTemplatePageKind,
  resolveCatalogPageTitle,
} from "../../shared/page-templates.js";
import {
  marketingPagePath,
  type MarketingPageKind,
  type MarketingPageListItem,
} from "../../shared/site-cms.js";
import { siteLocaleOrder } from "../../shared/site-locale.js";

import type { AppLocale } from "@rewindom/shared";

/** CMS 列表里同一逻辑 URL 的翻译组（key = `kind` + `slug`）。 */
export interface SitePageGroup {
  kind: MarketingPageKind;
  slug: string;
  /** 逻辑路径（不含 locale 前缀），各组共享。 */
  path: string;
  /**
   * 展示用标题：优先站点主语言，否则按语言顺序取第一篇。
   *
   * 标题空着（存量的模板页快照）时回落版式预设文案，与公开面同一条口径——
   * 中台写「未命名页面」而线上是「事件雷达」只会让人以为是两张页。
   */
  title: string;
  /** 组内各语言行，按 `siteLocaleOrder` 排序。 */
  pages: MarketingPageListItem[];
}

/**
 * 把页面清单按翻译组合并：同 `(kind, slug)` 的不同语言合成一组。
 *
 * 组顺序保留 API 列表首次出现的顺序（服务端已按 `sort_order`）。
 */
export function groupSitePages(
  pages: MarketingPageListItem[],
  defaultLocale: AppLocale,
): SitePageGroup[] {
  const localeRank = new Map(
    siteLocaleOrder(defaultLocale).map((locale, index) => [locale, index]),
  );
  const byKey = new Map<string, MarketingPageListItem[]>();
  const keyOrder: string[] = [];

  for (const page of pages) {
    // 模板页（含首页）有自己的常驻行（`SiteTemplatePageRows`），不进可排序目录
    if (isTemplatePageKind(page.kind)) continue;
    const key = `${page.kind}\0${page.slug}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.push(page);
      continue;
    }
    byKey.set(key, [page]);
    keyOrder.push(key);
  }

  return keyOrder.map((key) => {
    const groupPages = [...(byKey.get(key) ?? [])].sort(
      (a, b) =>
        (localeRank.get(a.locale) ?? Number.MAX_SAFE_INTEGER) -
        (localeRank.get(b.locale) ?? Number.MAX_SAFE_INTEGER),
    );
    const primary =
      groupPages.find((page) => page.locale === defaultLocale) ??
      groupPages[0]!;
    return {
      kind: primary.kind,
      slug: primary.slug,
      path: marketingPagePath(primary.kind, primary.slug),
      title: resolveCatalogPageTitle(
        primary.kind,
        primary.locale,
        primary.title,
      ),
      pages: groupPages,
    };
  });
}

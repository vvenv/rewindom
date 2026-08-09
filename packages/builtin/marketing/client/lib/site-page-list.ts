import { APP_LOCALES, type AppLocale } from "@be-water/shared";

import type { SitePageGroup } from "./site-page-groups.js";
import type { MarketingPageListItem } from "../../shared/site-cms.js";

/** 状态筛选：与文档库同一套语义（`dirty` = 已发布但草稿有改动）。 */
export const SITE_PAGE_STATUS_FILTERS = [
  "published",
  "draft",
  "dirty",
] as const;

export type SitePageStatusFilter = (typeof SITE_PAGE_STATUS_FILTERS)[number];

export interface SitePageFilterState {
  q?: string;
  status?: string;
  locale?: string;
}

/** 列表里出现过的语言，按 `APP_LOCALES` 的顺序；只有一种时那组筛选不画。 */
export function collectSitePageLocales(
  pages: readonly MarketingPageListItem[],
): AppLocale[] {
  const seen = new Set<string>(pages.map((page) => page.locale));
  return APP_LOCALES.map((locale) => locale.slug).filter((slug) =>
    seen.has(slug),
  );
}

function matchesPageQuery(
  group: SitePageGroup,
  page: MarketingPageListItem,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  // 路径按组算（各语言共享），标题按页算——译文标题跟组头那个不一定是同一串
  return [group.path, group.slug, page.title, page.description].some((field) =>
    field.toLowerCase().includes(needle),
  );
}

function matchesPageStatus(
  page: MarketingPageListItem,
  status: string | undefined,
): boolean {
  switch (status) {
    case "published":
      return page.status === "published";
    case "draft":
      return page.status === "draft";
    case "dirty":
      return page.status === "published" && page.content_dirty;
    default:
      return true;
  }
}

/**
 * 按筛选条件裁剪翻译组。
 *
 * 裁的是**组内的语言行**，剩一行也保留这一组：筛「草稿」时把一组里已发布的那几语言
 * 抹掉、只留草稿那一行，才对得上「我要找还没发的东西」。整组一行都不剩才丢掉整组。
 * 组的先后不动——那是 `sort_order`，不是搜索相关性。
 */
export function filterSitePageGroups(
  groups: readonly SitePageGroup[],
  filters: SitePageFilterState,
): SitePageGroup[] {
  const out: SitePageGroup[] = [];
  for (const group of groups) {
    const pages = group.pages.filter(
      (page) =>
        matchesPageQuery(group, page, filters.q ?? "") &&
        matchesPageStatus(page, filters.status) &&
        (!filters.locale || page.locale === filters.locale),
    );
    if (pages.length > 0) out.push({ ...group, pages });
  }
  return out;
}

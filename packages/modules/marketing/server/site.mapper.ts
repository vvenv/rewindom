import { normalizeLocale, type AppLocale } from "@be-water/shared";

import {
  localizeSections,
  localizeSiteText,
  parseSiteNameValue,
} from "../shared/section-schema.js";
import {
  canonicalizePageIdentity,
  marketingPagePath,
  safePageSettings,
  type MarketingPage,
  type MarketingPageKind,
  type MarketingPageListItem,
  type MarketingPageStatus,
  type MarketingSite,
  type PageLocaleAlternate,
  type PublicMarketingPage,
  type PublicMarketingSite,
} from "../shared/site-cms.js";
import { withSiteLocale } from "../shared/site-locale.js";
import { resolveThemeSettings } from "../shared/theme-sections.js";

import {
  pageContentDraft,
  pageContentIsDirty,
  pageContentPublished,
  siteChromeDraftFooter,
  siteChromeDraftHeader,
  siteChromeIsDirty,
  siteChromePublishedFooter,
  siteChromePublishedHeader,
} from "./site.util.js";

import type {
  MarketingPage as MarketingPageRecord,
  MarketingSite as MarketingSiteRecord,
} from "@be-water/server-kernel/generated/prisma/client/client.js";

/** 读路径：把存量 `doc` 收成 page，并改写 slug（`index` → `docs`）。 */
function pageIdentity(record: { kind: string; slug: string }): {
  kind: MarketingPageKind;
  slug: string;
} {
  return canonicalizePageIdentity(record.kind, record.slug);
}

function asStatus(value: string): MarketingPageStatus {
  return value === "published" ? "published" : "draft";
}

export function toMarketingSite(record: MarketingSiteRecord): MarketingSite {
  const theme_settings = resolveThemeSettings(record.theme_settings);
  return {
    id: record.id,
    tenant_id: record.tenant_id,
    site_name: parseSiteNameValue(record.site_name),
    tagline: record.tagline,
    // 顶层两个字段是 theme_settings 的**派生值**，方便调用方直接取
    logo_url: theme_settings.logo_url ?? null,
    primary_color: theme_settings.primary_color ?? null,
    theme_settings,
    default_locale: normalizeLocale(record.default_locale),
    // 管理端读**草稿** chrome；`chrome_dirty` 标出与线上的差异
    header: siteChromeDraftHeader(record),
    footer: siteChromeDraftFooter(record),
    chrome_dirty: siteChromeIsDirty(record),
    published: record.published,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}

export function toMarketingPage(record: MarketingPageRecord): MarketingPage {
  const { kind, slug } = pageIdentity(record);
  const draft = pageContentDraft(record);
  return {
    id: record.id,
    tenant_id: record.tenant_id,
    slug,
    locale: normalizeLocale(record.locale),
    kind,
    title: draft.title,
    description: draft.description,
    sections: draft.sections,
    settings: safePageSettings(record.settings),
    status: asStatus(record.status),
    content_dirty: pageContentIsDirty(record),
    sort_order: record.sort_order,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}

export function toMarketingPageListItem(
  record: MarketingPageRecord,
): MarketingPageListItem {
  const { kind, slug } = pageIdentity(record);
  const draft = pageContentDraft(record);
  return {
    id: record.id,
    slug,
    locale: normalizeLocale(record.locale),
    kind,
    title: draft.title,
    description: draft.description,
    settings: safePageSettings(record.settings),
    status: asStatus(record.status),
    content_dirty: pageContentIsDirty(record),
    sort_order: record.sort_order,
    updated_at: record.updated_at.toISOString(),
  };
}

/** 有已发布页面的语言（站点默认语言恒定在列，否则切换器会把主入口漏掉）。 */
function availableLocales(
  pages: MarketingPageRecord[],
  defaultLocale: AppLocale,
): AppLocale[] {
  const found = new Set<AppLocale>([defaultLocale]);
  for (const page of pages) {
    found.add(normalizeLocale(page.locale, defaultLocale));
  }
  return [...found];
}

/**
 * 对外渲染用的站点视图，**按单一语言**投影。
 *
 * 两件事在这里一次做掉：
 * 1. `pages` 只留 `locale` 这一种语言——不过滤的话导航 / 同级菜单 / sitemap
 *    会为同一个 slug 出现多条（每种语言一条，路径还完全相同）。
 * 2. 页头 / 页脚的多语言文案压成当前语言。
 *
 * `brandingLogoUrl` 是租户在「系统管理 → 品牌」上传的 logo：官网**默认继承**它，
 * 站点自己填的 `theme_settings.logo_url` 只是可选覆盖。只在这里回落，不动
 * 管理端的 `toMarketingSite`——那份数据会灌进设置表单，填进去一存就把继承关系写死了。
 */
export function toPublicMarketingSite(
  site: MarketingSiteRecord,
  pages: MarketingPageRecord[],
  brandingLogoUrl: string | null = null,
  locale?: AppLocale,
  options?: { draftChrome?: boolean; draftContent?: boolean },
): PublicMarketingSite {
  const resolved = resolveThemeSettings(site.theme_settings);
  const logo_url = resolved.logo_url ?? brandingLogoUrl;
  // 两处渲染都走 `resolveThemeSettings`，回落后的值要同时落在 theme_settings 上，
  // 否则那边的 `fromJson.logo_url !== undefined` 会用显式 null 把它盖回去
  const theme_settings = { ...resolved, logo_url };
  const default_locale = normalizeLocale(site.default_locale);
  const current = locale ?? default_locale;
  const useDraftChrome = options?.draftChrome === true;
  const useDraftContent = options?.draftContent === true;
  const headerSections = useDraftChrome
    ? siteChromeDraftHeader(site)
    : siteChromePublishedHeader(site);
  const footerSections = useDraftChrome
    ? siteChromeDraftFooter(site)
    : siteChromePublishedFooter(site);

  return {
    site_name: localizeSiteText(site.site_name, current, default_locale),
    tagline: site.tagline,
    logo_url,
    primary_color: theme_settings.primary_color ?? null,
    theme_settings,
    default_locale,
    locale: current,
    available_locales: availableLocales(pages, default_locale),
    header: localizeSections(headerSections, current, default_locale),
    footer: localizeSections(footerSections, current, default_locale),
    pages: pages
      .filter(
        (page) => normalizeLocale(page.locale, default_locale) === current,
      )
      .map((page) => {
        const { kind, slug } = pageIdentity(page);
        const content = useDraftContent
          ? pageContentDraft(page)
          : pageContentPublished(page);
        return {
          slug,
          locale: normalizeLocale(page.locale, default_locale),
          kind,
          title: content.title,
          description: content.description,
          path: marketingPagePath(kind, slug),
          settings: safePageSettings(page.settings),
        };
      }),
  };
}

/**
 * 同一篇内容的其它语言入口。
 *
 * 翻译组的 key 是 `(kind, slug)`——`@@unique([tenant_id, slug, locale])` 已经保证
 * 同 slug 的不同语言行天然成组，不需要额外的关联列。
 */
function pageAlternates(
  record: MarketingPageRecord,
  siblings: MarketingPageRecord[],
  defaultLocale: AppLocale,
): PageLocaleAlternate[] {
  const { kind, slug } = pageIdentity(record);
  const logicalPath = marketingPagePath(kind, slug);
  const seen = new Set<AppLocale>();
  const out: PageLocaleAlternate[] = [];
  for (const page of siblings) {
    const sibling = pageIdentity(page);
    if (sibling.slug !== slug || sibling.kind !== kind) continue;
    const locale = normalizeLocale(page.locale, defaultLocale);
    if (seen.has(locale)) continue;
    seen.add(locale);
    out.push({
      locale,
      path: withSiteLocale(logicalPath, locale, defaultLocale),
    });
  }
  return out;
}

export function toPublicMarketingPage(
  record: MarketingPageRecord,
  options?: {
    siblings?: MarketingPageRecord[];
    defaultLocale?: AppLocale;
    draftContent?: boolean;
  },
): PublicMarketingPage {
  const { kind, slug } = pageIdentity(record);
  const default_locale = options?.defaultLocale ?? normalizeLocale(undefined);
  const locale = normalizeLocale(record.locale, default_locale);
  const content =
    options?.draftContent === true
      ? pageContentDraft(record)
      : pageContentPublished(record);
  return {
    slug,
    locale,
    kind,
    title: content.title,
    description: content.description,
    sections: localizeSections(
      content.sections,
      locale,
      default_locale,
    ),
    settings: safePageSettings(record.settings),
    path: marketingPagePath(kind, slug),
    alternates: pageAlternates(
      record,
      options?.siblings ?? [record],
      default_locale,
    ),
    updated_at: record.updated_at.toISOString(),
  };
}

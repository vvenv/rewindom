import { normalizeLocale, type AppLocale } from "@rewindom/shared";

import { DEFAULT_HOME_LAYOUT_KEY } from "../shared/home-layouts.js";
import {
  publicCatalogSources,
  resolveCatalogPageDescription,
  resolveCatalogPageTitle,
  resolveEditorTemplateCopy,
} from "../shared/page-templates.js";
import {
  localizeSections,
  localizeSiteText,
  parseSiteNameValue,
} from "../shared/section-schema.js";
import {
  parseSiteAnalytics,
  renderSiteAnalyticsHtml,
} from "../shared/site-analytics.js";
import {
  canonicalizePageIdentity,
  comparePublicCatalogPages,
  marketingPagePath,
  type MarketingPage,
  type MarketingPageKind,
  type MarketingPageListItem,
  type MarketingPageStatus,
  type MarketingSite,
  parsePageVisibility,
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
  siteDraftIsDirty,
  siteChromePublishedFooter,
  siteChromePublishedHeader,
} from "./site.util.js";

import type {
  MarketingPage as MarketingPageRecord,
  MarketingSite as MarketingSiteRecord,
} from "@rewindom/server-kernel/generated/prisma/client/client.js";

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

export function toMarketingSite(
  record: MarketingSiteRecord,
  enabledEntitlements?: ReadonlySet<string>,
): MarketingSite {
  /*
   * 管理端读**草稿**主题（与草稿 chrome 同一口径）：编辑器改的、预览渲染的都是它，
   * 访客看到的那一份要等发布。读线上那一列的话，编辑器一打开就把已保存的草稿冲掉了。
   */
  const theme_settings = resolveThemeSettings(record.theme_settings_draft);
  return {
    id: record.id,
    tenant_id: record.tenant_id,
    site_name: parseSiteNameValue(record.site_name),
    tagline: parseSiteNameValue(record.tagline),
    // 顶层两个字段是 theme_settings 的**派生值**，方便调用方直接取
    logo_url: theme_settings.logo_url ?? null,
    primary_color: theme_settings.primary_color ?? null,
    theme_settings,
    theme_key: record.theme_key,
    default_locale: normalizeLocale(record.default_locale),
    // 管理端读**草稿** chrome；`site_draft_dirty` 标出草稿与线上的差异（含主题）
    header: siteChromeDraftHeader(record, enabledEntitlements),
    footer: siteChromeDraftFooter(record, enabledEntitlements),
    site_draft_dirty: siteDraftIsDirty(record),
    published: record.published,
    home_path: record.home_path || "/",
    home_layout_key: record.home_layout_key || DEFAULT_HOME_LAYOUT_KEY,
    analytics: parseSiteAnalytics(record.analytics),
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}

export function toMarketingPage(
  record: MarketingPageRecord,
  enabledEntitlements?: ReadonlySet<string>,
): MarketingPage {
  const { kind, slug } = pageIdentity(record);
  const draft = pageContentDraft(record, enabledEntitlements);
  const locale = normalizeLocale(record.locale);
  const copy = resolveEditorTemplateCopy(kind, locale, draft);
  return {
    id: record.id,
    tenant_id: record.tenant_id,
    slug,
    locale,
    kind,
    title: copy.title,
    description: copy.description,
    sections: draft.sections,
    settings: draft.settings,
    visibility: parsePageVisibility(record.visibility),
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
  const locale = normalizeLocale(record.locale);
  const copy = resolveEditorTemplateCopy(kind, locale, draft);
  return {
    id: record.id,
    slug,
    locale,
    kind,
    title: copy.title,
    description: copy.description,
    visibility: parsePageVisibility(record.visibility),
    settings: draft.settings,
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
 * logo / favicon 就在 `theme_settings` 里，没有第二处来源可回落——它们是站点自己的
 * 资产，从官网卡片的「外观」填（`SiteImageField`，媒体库选图或外链）。
 */
export function toPublicMarketingSite(
  site: MarketingSiteRecord,
  pages: MarketingPageRecord[],
  locale?: AppLocale,
  options?: {
    draftChrome?: boolean;
    draftContent?: boolean;
    enabledEntitlements?: ReadonlySet<string>;
  },
): PublicMarketingSite {
  const theme_settings = resolveThemeSettings(site.theme_settings);
  const logo_url = theme_settings.logo_url ?? null;
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
    tagline: localizeSiteText(site.tagline, current, default_locale),
    logo_url,
    primary_color: theme_settings.primary_color ?? null,
    theme_settings,
    // 预览渲染的是草稿：那是编辑者自己在看，不该记进访客数据
    analytics_html:
      useDraftChrome || useDraftContent
        ? ""
        : renderSiteAnalyticsHtml(site.analytics),
    default_locale,
    locale: current,
    available_locales: availableLocales(pages, default_locale),
    header: localizeSections(headerSections, current, default_locale),
    footer: localizeSections(footerSections, current, default_locale),
    /*
     * 公开目录是「访客能点进的站点页面」——「全部一级页面」、同级菜单、
     * `page-menu` 都吃它。普通页面只收当前语言；`/shop` `/docs` 这类一级模板
     * 当前语言还没建行时，借用默认语言那一行，标题改成当前语言的预设文案。
     * 口径见 `publicCatalogSources`。
     */
    pages: publicCatalogSources(
      pages.map((record) => {
        const { kind, slug } = pageIdentity(record);
        return {
          record,
          kind,
          slug,
          locale: record.locale,
          sort_order: record.sort_order,
        };
      }),
      current,
      default_locale,
      options?.enabledEntitlements,
    )
      .sort((a, b) => comparePublicCatalogPages(a.page, b.page))
      .map(({ page: row, localizeFromPreset }) => {
        const content = useDraftContent
          ? pageContentDraft(row.record)
          : pageContentPublished(row.record);
        return {
          slug: row.slug,
          locale: current,
          kind: row.kind,
          title: resolveCatalogPageTitle(row.kind, current, content.title, {
            forcePreset: localizeFromPreset,
          }),
          description: resolveCatalogPageDescription(
            row.kind,
            current,
            content.description,
            { forcePreset: localizeFromPreset },
          ),
          path: marketingPagePath(row.kind, row.slug),
          settings: content.settings,
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
    /** 公开端点对会员页只返回摘要时置 true，并清空 sections。 */
    memberSummary?: boolean;
  },
): PublicMarketingPage {
  const { kind, slug } = pageIdentity(record);
  const default_locale = options?.defaultLocale ?? normalizeLocale(undefined);
  const locale = normalizeLocale(record.locale, default_locale);
  const content =
    options?.draftContent === true
      ? pageContentDraft(record)
      : pageContentPublished(record);
  const visibility = parsePageVisibility(record.visibility);
  const memberSummary = options?.memberSummary === true;
  return {
    slug,
    locale,
    kind,
    title: resolveCatalogPageTitle(kind, locale, content.title),
    description: resolveCatalogPageDescription(
      kind,
      locale,
      content.description,
    ),
    sections: memberSummary
      ? []
      : localizeSections(content.sections, locale, default_locale),
    settings: content.settings,
    visibility,
    ...(memberSummary ? { requires_member: true as const } : {}),
    path: marketingPagePath(kind, slug),
    alternates: pageAlternates(
      record,
      options?.siblings ?? [record],
      default_locale,
    ),
    updated_at: record.updated_at.toISOString(),
  };
}

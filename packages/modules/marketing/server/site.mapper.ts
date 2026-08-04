import {
  marketingPagePath,
  safePageSettings,
  type MarketingPage,
  type MarketingPageKind,
  type MarketingPageListItem,
  type MarketingPageStatus,
  type MarketingSite,
  type PublicMarketingPage,
  type PublicMarketingSite,
} from "../shared/site-cms.js";
import { resolveThemeSettings } from "../shared/theme-sections.js";

import { safePageSections, safeSiteAreaSection } from "./site.util.js";

import type {
  MarketingPage as MarketingPageRecord,
  MarketingSite as MarketingSiteRecord,
} from "@be-water/server-kernel/generated/prisma/client/client.js";

function asKind(value: string): MarketingPageKind {
  if (value === "home" || value === "doc" || value === "page") return value;
  return "page";
}

function asStatus(value: string): MarketingPageStatus {
  return value === "published" ? "published" : "draft";
}

export function toMarketingSite(record: MarketingSiteRecord): MarketingSite {
  const theme_settings = resolveThemeSettings(record.theme_settings);
  return {
    id: record.id,
    tenant_id: record.tenant_id,
    site_name: record.site_name,
    tagline: record.tagline,
    // 顶层两个字段是 theme_settings 的**派生值**，方便调用方直接取
    logo_url: theme_settings.logo_url ?? null,
    primary_color: theme_settings.primary_color ?? null,
    theme_settings,
    default_locale: record.default_locale,
    header: safeSiteAreaSection("header", record.nav_json),
    footer: safeSiteAreaSection("footer", record.footer_json),
    published: record.published,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}

export function toMarketingPage(record: MarketingPageRecord): MarketingPage {
  const kind = asKind(record.kind);
  return {
    id: record.id,
    tenant_id: record.tenant_id,
    slug: record.slug,
    locale: record.locale,
    kind,
    title: record.title,
    description: record.description,
    body_md: record.body_md,
    sections: safePageSections(record.sections),
    settings: safePageSettings(record.settings),
    status: asStatus(record.status),
    sort_order: record.sort_order,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}

export function toMarketingPageListItem(
  record: MarketingPageRecord,
): MarketingPageListItem {
  return {
    id: record.id,
    slug: record.slug,
    locale: record.locale,
    kind: asKind(record.kind),
    title: record.title,
    description: record.description,
    status: asStatus(record.status),
    sort_order: record.sort_order,
    updated_at: record.updated_at.toISOString(),
  };
}

/**
 * 对外渲染用的站点视图。
 *
 * `brandingLogoUrl` 是租户在「系统管理 → 品牌」上传的 logo：官网**默认继承**它，
 * 站点自己填的 `theme_settings.logo_url` 只是可选覆盖。只在这里回落，不动
 * 管理端的 `toMarketingSite`——那份数据会灌进设置表单，填进去一存就把继承关系写死了。
 */
export function toPublicMarketingSite(
  site: MarketingSiteRecord,
  pages: MarketingPageRecord[],
  brandingLogoUrl: string | null = null,
): PublicMarketingSite {
  const resolved = resolveThemeSettings(site.theme_settings);
  const logo_url = resolved.logo_url ?? brandingLogoUrl;
  // 两处渲染都走 `resolveThemeSettings`，回落后的值要同时落在 theme_settings 上，
  // 否则那边的 `fromJson.logo_url !== undefined` 会用显式 null 把它盖回去
  const theme_settings = { ...resolved, logo_url };

  return {
    site_name: site.site_name,
    tagline: site.tagline,
    logo_url,
    primary_color: theme_settings.primary_color ?? null,
    theme_settings,
    default_locale: site.default_locale,
    header: safeSiteAreaSection("header", site.nav_json),
    footer: safeSiteAreaSection("footer", site.footer_json),
    pages: pages.map((page) => {
      const kind = asKind(page.kind);
      return {
        slug: page.slug,
        locale: page.locale,
        kind,
        title: page.title,
        description: page.description,
        path: marketingPagePath(kind, page.slug),
      };
    }),
  };
}

export function toPublicMarketingPage(
  record: MarketingPageRecord,
): PublicMarketingPage {
  const kind = asKind(record.kind);
  return {
    slug: record.slug,
    locale: record.locale,
    kind,
    title: record.title,
    description: record.description,
    body_md: record.body_md,
    sections: safePageSections(record.sections),
    settings: safePageSettings(record.settings),
    path: marketingPagePath(kind, record.slug),
    updated_at: record.updated_at.toISOString(),
  };
}

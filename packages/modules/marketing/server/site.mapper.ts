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
  const theme_settings = resolveThemeSettings({
    theme_settings: record.theme_settings,
    logo_url: record.logo_url,
    primary_color: record.primary_color,
  });
  return {
    id: record.id,
    tenant_id: record.tenant_id,
    site_name: record.site_name,
    tagline: record.tagline,
    logo_url: theme_settings.logo_url ?? record.logo_url,
    primary_color: theme_settings.primary_color ?? record.primary_color,
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

export function toPublicMarketingSite(
  site: MarketingSiteRecord,
  pages: MarketingPageRecord[],
): PublicMarketingSite {
  const theme_settings = resolveThemeSettings({
    theme_settings: site.theme_settings,
    logo_url: site.logo_url,
    primary_color: site.primary_color,
  });

  return {
    site_name: site.site_name,
    tagline: site.tagline,
    logo_url: theme_settings.logo_url ?? null,
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

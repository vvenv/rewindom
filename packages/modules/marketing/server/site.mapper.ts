import {
  marketingPagePath,
  type MarketingPage,
  type MarketingPageKind,
  type MarketingPageListItem,
  type MarketingPageStatus,
  type MarketingSite,
  type PublicMarketingPage,
  type PublicMarketingSite,
  type SiteLinkItem,
} from "../shared/site-cms.js";
import { parseLinkList, safeHomeBlocks } from "./site.util.js";

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
  return {
    id: record.id,
    tenant_id: record.tenant_id,
    site_name: record.site_name,
    tagline: record.tagline,
    logo_url: record.logo_url,
    primary_color: record.primary_color,
    default_locale: record.default_locale,
    nav: parseLinkList(record.nav_json, "nav"),
    footer: parseLinkList(record.footer_json, "footer"),
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
    home_blocks: safeHomeBlocks(record.home_blocks),
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
  let nav: SiteLinkItem[] = [];
  let footer: SiteLinkItem[] = [];
  try {
    nav = parseLinkList(site.nav_json, "nav");
    footer = parseLinkList(site.footer_json, "footer");
  } catch {
    nav = [];
    footer = [];
  }

  return {
    site_name: site.site_name,
    tagline: site.tagline,
    logo_url: site.logo_url,
    primary_color: site.primary_color,
    default_locale: site.default_locale,
    nav,
    footer,
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
    home_blocks: safeHomeBlocks(record.home_blocks),
    path: marketingPagePath(kind, record.slug),
    updated_at: record.updated_at.toISOString(),
  };
}

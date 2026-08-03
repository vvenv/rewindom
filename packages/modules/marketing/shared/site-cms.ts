import type { SiteSection, ThemeSettings } from "./theme-sections.js";

/** 导航 / 页脚链接项。 */
export interface SiteLinkItem {
  label: string;
  href: string;
}

export type MarketingPageKind = "home" | "page" | "doc";
export type MarketingPageStatus = "draft" | "published";

export interface MarketingSite {
  id: string;
  tenant_id: string;
  site_name: string;
  tagline: string;
  logo_url: string | null;
  primary_color: string | null;
  theme_settings: ThemeSettings;
  default_locale: string;
  nav: SiteLinkItem[];
  footer: SiteLinkItem[];
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarketingPage {
  id: string;
  tenant_id: string;
  slug: string;
  locale: string;
  kind: MarketingPageKind;
  title: string;
  description: string;
  body_md: string;
  sections: SiteSection[];
  status: MarketingPageStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MarketingPageListItem {
  id: string;
  slug: string;
  locale: string;
  kind: MarketingPageKind;
  title: string;
  description: string;
  status: MarketingPageStatus;
  sort_order: number;
  updated_at: string;
}

export interface UpdateMarketingSiteBody {
  site_name?: string;
  tagline?: string;
  logo_url?: string | null;
  primary_color?: string | null;
  theme_settings?: ThemeSettings;
  default_locale?: string;
  nav?: SiteLinkItem[];
  footer?: SiteLinkItem[];
  published?: boolean;
}

export interface CreateMarketingPageBody {
  slug: string;
  locale?: string;
  kind?: MarketingPageKind;
  title: string;
  description?: string;
  body_md?: string;
  sections?: SiteSection[];
  sort_order?: number;
}

export interface UpdateMarketingPageBody {
  slug?: string;
  locale?: string;
  kind?: MarketingPageKind;
  title?: string;
  description?: string;
  body_md?: string;
  sections?: SiteSection[];
  sort_order?: number;
}

/** 公开站点（仅已发布内容）。 */
export interface PublicMarketingSite {
  site_name: string;
  tagline: string;
  logo_url: string | null;
  primary_color: string | null;
  theme_settings: ThemeSettings;
  default_locale: string;
  nav: SiteLinkItem[];
  footer: SiteLinkItem[];
  pages: Array<{
    slug: string;
    locale: string;
    kind: MarketingPageKind;
    title: string;
    description: string;
    path: string;
  }>;
}

export interface PublicMarketingPage {
  slug: string;
  locale: string;
  kind: MarketingPageKind;
  title: string;
  description: string;
  body_md: string;
  sections: SiteSection[];
  path: string;
  updated_at: string;
}

/** 自定义 page slug 不可占用的保留段。 */
export const RESERVED_PAGE_SLUGS = new Set([
  "home",
  "app",
  "login",
  "register",
  "platform",
  "api",
  "assets",
  "docs",
  "pricing",
  "health",
  "billing",
  "settings",
  "notes",
  "todos",
  "users",
  "roles",
  "audit",
  "notifications",
  "sitemap.xml",
  "robots.txt",
]);

export function marketingPagePath(
  kind: MarketingPageKind,
  slug: string,
): string {
  if (kind === "home") return "/";
  if (kind === "doc" && slug === "index") return "/docs";
  if (kind === "doc") return `/docs/${slug}`;
  return `/${slug}`;
}

import type { SiteSection } from "./section-schema.js";
import type { ThemePageNav, ThemeSettings } from "./theme-sections.js";

/**
 * 导航 / 页脚链接项。
 *
 * @deprecated 页头页脚已改为 schema 驱动的 `header` / `footer` section；
 * 此类型只用于解析存量 `nav_json` / `footer_json` 的数组形态。
 */
export interface SiteLinkItem {
  label: string;
  href: string;
}

export type MarketingPageKind = "home" | "page" | "doc";
export type MarketingPageStatus = "draft" | "published";

/**
 * 页面级设置（当前只有同级页面菜单）。
 *
 * `inherit` 是默认值，跟随站点主题里的 `page_nav`；单页可以自己覆写成左 / 右 / 不显示。
 */
export const PAGE_NAV_MODES = ["inherit", "left", "right", "off"] as const;
export type PageNavMode = (typeof PAGE_NAV_MODES)[number];

export interface MarketingPageSettings {
  page_nav?: PageNavMode;
}

/** 写路径：非法值直接拒绝（code 由 service 转 ValidationError）。 */
export function parsePageSettings(value: unknown): MarketingPageSettings {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("site.page_settings_invalid");
  }
  const raw = value as Record<string, unknown>;
  const out: MarketingPageSettings = {};
  if (raw.page_nav !== undefined) {
    if (
      typeof raw.page_nav !== "string" ||
      !(PAGE_NAV_MODES as readonly string[]).includes(raw.page_nav)
    ) {
      throw new Error("site.page_settings_invalid");
    }
    out.page_nav = raw.page_nav as PageNavMode;
  }
  return out;
}

/** 读路径：脏数据回落默认，不因为一条坏设置整页打不开。 */
export function safePageSettings(value: unknown): MarketingPageSettings {
  try {
    return parsePageSettings(value);
  } catch {
    return {};
  }
}

/** 页面设置优先，未设置（inherit）时用站点主题的默认值。 */
export function resolvePageNav(
  settings: MarketingPageSettings | undefined,
  siteDefault: ThemePageNav | undefined,
): ThemePageNav {
  const mode = settings?.page_nav ?? "inherit";
  return mode === "inherit" ? (siteDefault ?? "left") : mode;
}

export interface MarketingSite {
  id: string;
  tenant_id: string;
  site_name: string;
  tagline: string;
  logo_url: string | null;
  primary_color: string | null;
  theme_settings: ThemeSettings;
  default_locale: string;
  /** 站点级区域：schema 驱动，出现在所有页面上。 */
  header: SiteSection;
  footer: SiteSection;
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
  settings: MarketingPageSettings;
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
  header?: SiteSection;
  footer?: SiteSection;
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
  settings?: MarketingPageSettings;
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
  settings?: MarketingPageSettings;
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
  header: SiteSection;
  footer: SiteSection;
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
  settings: MarketingPageSettings;
  path: string;
  updated_at: string;
}

/**
 * 自定义 page slug 不可占用的保留段。
 *
 * `pricing` 刻意**不**保留：绑定域名上的 `/pricing` 应该是租户自己的定价页，
 * 平台定价页只在平台域名下有意义（`Pricing` 组件已按租户站点回落）。
 * `docs` 仍保留——文档目录页由 `kind: "doc"` + `slug: "index"` 占位。
 */
export const RESERVED_PAGE_SLUGS = new Set([
  "home",
  "app",
  "login",
  "register",
  "platform",
  "api",
  "assets",
  "docs",
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

export type PublicSitePage = PublicMarketingSite["pages"][number];

/** 父路径：`/docs/quickstart` → `/docs`；`/about` → `/`。 */
export function pageParentPath(path: string): string {
  const normalized =
    path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  if (normalized === "/" || normalized === "") return "/";
  return normalized.slice(0, normalized.lastIndexOf("/")) || "/";
}

/** 路径深度：`/` → 0，`/about` → 1，`/docs/quickstart` → 2。 */
export function pageDepth(path: string): number {
  return path.split("/").filter(Boolean).length;
}

/**
 * 同级页面：与 `path` 共享同一父路径的所有页面 + 父页面本身。
 *
 * 与页面 kind 无关——`/docs/*` 的兄弟是其它文档页，顶层页的兄弟是其它顶层页。
 * 顺序沿用传入的 `pages`（服务端按 sort_order 排好）。
 */
export function siblingPages(
  pages: PublicSitePage[],
  path: string,
): { parent: PublicSitePage | null; items: PublicSitePage[] } {
  const parentPath = pageParentPath(path);
  return {
    parent: pages.find((p) => p.path === parentPath) ?? null,
    items: pages.filter(
      (p) => p.path !== parentPath && pageParentPath(p.path) === parentPath,
    ),
  };
}

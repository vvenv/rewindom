import { APP_LOCALES, type AppLocale } from "@be-water/shared";

import { normalizeSiteColor } from "./site-color.js";

import type { LocalizedText, SiteSection } from "./section-schema.js";
import type { ThemeSettings } from "./theme-sections.js";

/** 站点级可本地化文案：单语言为纯字符串，多语言为 `__i18n` 表。 */
export type SiteLocalizedText = string | LocalizedText;

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

export type MarketingPageKind = "home" | "page";
export type MarketingPageStatus = "draft" | "published";

/**
 * 页面级设置。
 *
 * 版式仍落在 section 上；这里只放整页画布覆盖（背景 / 前景），避免每段都抄一遍。
 */
export interface MarketingPageSettings {
  bg_color?: string | null;
  fg_color?: string | null;
}

/** 写路径：非法值直接拒绝（code 由 service 转 ValidationError）。 */
export function parsePageSettings(value: unknown): MarketingPageSettings {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("site.page_settings_invalid");
  }
  const raw = value as Record<string, unknown>;
  const out: MarketingPageSettings = {};

  if (raw.bg_color !== undefined) {
    if (raw.bg_color === null || raw.bg_color === "") {
      out.bg_color = null;
    } else {
      const color = normalizeSiteColor(raw.bg_color, { allowAlpha: true });
      if (!color) throw new Error("site.page_settings_invalid");
      out.bg_color = color;
    }
  }

  if (raw.fg_color !== undefined) {
    if (raw.fg_color === null || raw.fg_color === "") {
      out.fg_color = null;
    } else {
      const color = normalizeSiteColor(raw.fg_color, { allowAlpha: true });
      if (!color) throw new Error("site.page_settings_invalid");
      out.fg_color = color;
    }
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

export interface MarketingSite {
  id: string;
  tenant_id: string;
  /** 管理端保留整张表；公开面经 `toPublicMarketingSite` 压成当前语言字符串。 */
  site_name: SiteLocalizedText;
  tagline: string;
  logo_url: string | null;
  primary_color: string | null;
  theme_settings: ThemeSettings;
  default_locale: AppLocale;
  /** 站点级区域：schema 驱动，出现在所有页面上（**草稿**，保存后不一定已上线）。 */
  header: SiteSection[];
  footer: SiteSection[];
  /** 草稿 chrome 是否与线上一致。 */
  chrome_dirty: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarketingPage {
  id: string;
  tenant_id: string;
  slug: string;
  locale: AppLocale;
  kind: MarketingPageKind;
  title: string;
  description: string;
  sections: SiteSection[];
  settings: MarketingPageSettings;
  status: MarketingPageStatus;
  /** 草稿正文是否与线上一致（仅 `published` 页有意义）。 */
  content_dirty: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MarketingPageListItem {
  id: string;
  slug: string;
  locale: AppLocale;
  kind: MarketingPageKind;
  title: string;
  description: string;
  settings: MarketingPageSettings;
  status: MarketingPageStatus;
  content_dirty: boolean;
  sort_order: number;
  updated_at: string;
}

export interface UpdateMarketingSiteBody {
  site_name?: SiteLocalizedText;
  tagline?: string;
  logo_url?: string | null;
  primary_color?: string | null;
  theme_settings?: ThemeSettings;
  default_locale?: string;
  header?: SiteSection[];
  footer?: SiteSection[];
  published?: boolean;
}

export interface CreateMarketingPageBody {
  slug: string;
  locale?: string;
  kind?: MarketingPageKind;
  title: string;
  description?: string;
  sections?: SiteSection[];
  settings?: MarketingPageSettings;
  sort_order?: number;
}

/**
 * 复制页面：主要用途是**从一种语言复制出另一种语言**的同一篇内容。
 *
 * slug 不让填：同 `(kind, slug)` 就是翻译组的 key，复制到别的语言必须沿用源 slug
 * 才能自动成组；复制到**同一种语言**时由服务端派生一个不冲突的 slug（`about-copy`）。
 */
export interface DuplicateMarketingPageBody {
  title: string;
  locale?: string;
}

/**
 * Theme Editor 的一次保存：页面内容 + 站点级页头页脚一起提交。
 * 这两样分属两张表，分两个请求写会留下半截状态（见 `saveEditorDraft`）。
 */
export interface SaveEditorDraftBody {
  title: string;
  description: string;
  sections: unknown;
  header: unknown;
  footer: unknown;
  /** 页面画布外观（背景 / 前景）；与内容同一次保存。 */
  settings?: MarketingPageSettings;
}

/** Theme Editor 事务保存的响应：页面与站点 chrome 同批落库。 */
export interface SaveEditorDraftResponse {
  page: MarketingPage;
  site: MarketingSite;
}

/** 应用站点起步模板的响应。 */
export interface ApplySiteStarterResponse {
  site: MarketingSite;
  pages: MarketingPage[];
  home_page_id: string;
}

export interface UpdateMarketingPageBody {
  slug?: string;
  locale?: string;
  kind?: MarketingPageKind;
  title?: string;
  description?: string;
  sections?: SiteSection[];
  settings?: MarketingPageSettings;
  sort_order?: number;
}

/**
 * 公开站点（仅已发布内容），**按单一语言渲染过**。
 *
 * `pages` 只含 `locale` 这一种语言的页面——不过滤的话导航、同级菜单、sitemap
 * 都会为同一个 slug 出现多条。页头 / 页脚的文案也已压成该语言。
 */
export interface PublicMarketingSite {
  site_name: string;
  tagline: string;
  logo_url: string | null;
  primary_color: string | null;
  theme_settings: ThemeSettings;
  /** 站点主语言：URL 上**不带**前缀的那一种。 */
  default_locale: AppLocale;
  /** 本次渲染用的语言。 */
  locale: AppLocale;
  /** 有已发布内容、因而值得出现在语言切换器里的语言（含 `default_locale`）。 */
  available_locales: AppLocale[];
  header: SiteSection[];
  footer: SiteSection[];
  /** `path` 是**逻辑路径**（不带 locale 前缀）；链接由渲染端按语言改写。 */
  pages: Array<{
    slug: string;
    locale: AppLocale;
    kind: MarketingPageKind;
    title: string;
    description: string;
    path: string;
    settings: MarketingPageSettings;
  }>;
}
/** 同一篇内容在另一种语言下的入口（hreflang / 语言切换器共用）。 */
export interface PageLocaleAlternate {
  locale: AppLocale;
  /** 已带 locale 前缀的实际 URL 路径。 */
  path: string;
}

export interface PublicMarketingPage {
  slug: string;
  locale: AppLocale;
  kind: MarketingPageKind;
  title: string;
  description: string;
  sections: SiteSection[];
  settings: MarketingPageSettings;
  /** 逻辑路径（不带 locale 前缀）。 */
  path: string;
  /**
   * 本页**已发布**的其它语言版本。
   *
   * 翻译组 = 同 `(tenant, kind, slug)`：slug 跨语言共享（`@@unique` 已保证唯一），
   * 所以不需要额外的关联列。恒定包含本页自己，便于直接渲染 hreflang。
   */
  alternates: PageLocaleAlternate[];
  updated_at: string;
}

/**
 * 自定义 page slug 的**第一段**不可占用的保留字。
 *
 * `pricing` / `docs` 刻意**不**保留：绑定域名上的 `/pricing`、`/docs` 归租户自己的
 * 页面（可用多段 slug，如 `docs/quickstart`）；平台页只在平台域名下有意义。
 */
export const RESERVED_PAGE_SLUGS = new Set([
  // locale 前缀占掉了一级路径：slug 叫 `en` 的顶层页会把整棵 `/en/*` 遮住。
  // slug 在写入前已小写，这里也存小写形态。
  ...APP_LOCALES.map((locale) => locale.slug.toLowerCase()),
  "home",
  "app",
  "login",
  "register",
  "platform",
  "api",
  "assets",
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

/**
 * 把存量 `kind: "doc"` 收成普通 page：`index` → `docs`，其它 → `docs/{slug}`。
 * 读路径兼容未跑 migration 的行；写路径也会先走这里再校验。
 */
export function canonicalizePageIdentity(
  kind: string | undefined,
  slug: string,
): { kind: MarketingPageKind; slug: string } {
  const trimmed = slug
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/gu, "");
  if (kind === "home" || trimmed === "home") {
    return { kind: "home", slug: "home" };
  }
  if (kind === "doc") {
    const next =
      trimmed === "" || trimmed === "index" ? "docs" : `docs/${trimmed}`;
    return { kind: "page", slug: next };
  }
  return { kind: "page", slug: trimmed };
}

export function marketingPagePath(
  kind: MarketingPageKind,
  slug: string,
): string {
  if (kind === "home") return "/";
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

/** 页面菜单数据源：子页面（目录页）或同级页面（详情侧栏）。 */
export const PAGE_MENU_SOURCES = ["children", "siblings"] as const;
export type PageMenuSource = (typeof PAGE_MENU_SOURCES)[number];

export interface PageMenu {
  /** 菜单标题（父页 / 当前页标题）；无对应页面时为 null。 */
  title: string | null;
  /** 标题链接的逻辑路径；无标题页时为 null。 */
  title_path: string | null;
  items: PublicSitePage[];
}

/**
 * 全站顶栏导航条目：一级页面（父路径为 `/`，不含首页）。
 *
 * 顺序沿用传入的 `pages`（服务端按 `sort_order` 排好）。
 * 与 `resolvePageMenu(pages, "/", "children")` 同结果，单独命名方便页头调用。
 */
export function siteNavPages(pages: PublicSitePage[]): PublicSitePage[] {
  return resolvePageMenu(pages, "/", "children").items;
}

/**
 * 解析页面菜单：`page-menu` section 与详情侧栏共用。
 *
 * - `children`：列当前路径下的直接子页（`/docs` → `/docs/*`）
 * - `siblings`：列与当前页同级的页面（详情侧栏）
 */
export function resolvePageMenu(
  pages: PublicSitePage[],
  currentPath: string,
  source: PageMenuSource = "children",
): PageMenu {
  if (source === "siblings") {
    const { parent, items } = siblingPages(pages, currentPath);
    return {
      title: parent?.title ?? null,
      title_path: parent?.path ?? null,
      items,
    };
  }

  const normalized =
    currentPath.length > 1 && currentPath.endsWith("/")
      ? currentPath.slice(0, -1)
      : currentPath || "/";
  const parent = pages.find((page) => page.path === normalized) ?? null;
  const items = pages.filter(
    (page) =>
      page.path !== normalized && pageParentPath(page.path) === normalized,
  );
  return {
    title: parent?.title ?? null,
    title_path: parent?.path ?? null,
    items,
  };
}

import { type AppLocale } from "@rewindom/shared";

import { getPageTemplateKind } from "./page-templates.js";
import { normalizeSiteColor } from "./site-color.js";

import type { LocalizedText, SiteSection } from "./section-schema.js";
import type { ThemeSettings } from "./theme-sections.js";

/** 站点级可本地化文案：单语言为纯字符串，多语言为 `__i18n` 表。 */
export type SiteLocalizedText = string | LocalizedText;

/**
 * 页面的种类。
 *
 * **不是闭合联合**：`page` 是租户自己排的普通页面（slug 自填）；`home` 与各张**模板页**
 *（kind 唯一、slug 固定）由系统在相关时快照落库，SSR 在记录尚未落库时用内置版式兜底。
 * 历史上 `home` 也出现在起步模板与页面列表里，所以仍单独保留 kind 名。其余模板页可由
 * 业务模块贡献——`member_login` 的版式属于 site-member，它的 kind 在 marketing 的
 * 编译期无从枚举（同 `SectionType` 的处理）。
 * 想知道一个 kind 是不是模板页、它的固定 slug 与路径是什么，一律查
 * `page-templates.ts` 的注册表。
 *
 * marketing 自带的模板页是 `home` 与 `not_found`。文档库、会员登录等由业务模块
 * `registerPageTemplateKind` 贡献——marketing 不认识那些 kind。
 *
 * SSR 在库里没有记录时仍用内置预设渲染——那是快照前的缺口，不是「默认不落库」的产品路径。
 */
export type MarketingPageKind = string;

/** 租户自己排的普通页面：只有 `page` 的 slug 由租户填（`home` 见模板页注册表）。 */
export type BuiltinPageKind = "home" | "page";
export type MarketingPageStatus = "draft" | "published";
/** 页面可见性：`public` 所有人；`members` 需站点会员登录。 */
export type MarketingPageVisibility = "public" | "members";

export function parsePageVisibility(value: unknown): MarketingPageVisibility {
  return value === "members" ? "members" : "public";
}

/**
 * 页面级设置。
 *
 * 版式仍落在 section 上；这里只放整页画布覆盖（背景 / 前景），避免每段都抄一遍。
 */
export interface MarketingPageSettings {
  bg_color?: string | null;
  fg_color?: string | null;
  /**
   * 社交分享缩略图（og:image / twitter:image）。
   *
   * 留空回落站点级默认（`theme_settings.og_image`）。存相对路径也行——渲染时按站点
   * origin 补成绝对地址，社交平台的抓取器不认相对路径。
   */
  og_image?: string | null;
  /**
   * 让搜索引擎不要收录本页。
   *
   * 只影响**这一页**：落地页 A/B、临时活动页、需要能访问但不该被搜出来的内容。
   * 打开后同时从 sitemap 里摘掉——留在 sitemap 里又标 noindex 是自相矛盾的信号。
   */
  noindex?: boolean;
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

  if (raw.og_image !== undefined) {
    out.og_image = parseSiteImageUrl(raw.og_image);
  }

  if (raw.noindex !== undefined) {
    if (typeof raw.noindex !== "boolean") {
      throw new Error("site.page_settings_invalid");
    }
    out.noindex = raw.noindex;
  }

  return out;
}

/**
 * 图片地址：站内相对路径或 http(s) 绝对地址。
 *
 * 只放行这两种是为了挡住 `javascript:` / `data:` 这类会被塞进 `<meta content>` 的东西
 *（og 标签本身不执行脚本，但同一个值也会进编辑器预览的 `<img src>`）。
 */
function parseSiteImageUrl(value: unknown): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("site.page_settings_invalid");
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (trimmed.startsWith("/")) return trimmed;
  if (/^https?:\/\//iu.test(trimmed)) return trimmed;
  throw new Error("site.page_settings_invalid");
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
  tagline: SiteLocalizedText;
  logo_url: string | null;
  primary_color: string | null;
  theme_settings: ThemeSettings;
  /**
   * 最近一次套用的主题包 key（`SITE_THEMES`）。记录的是「从哪个包出发」——
   * 租户逐项微调不清除它；「重设为最新主题」按它重新套用包的最新 token。
   */
  theme_key: string | null;
  default_locale: AppLocale;
  /** 站点级区域：schema 驱动，出现在所有页面上（**草稿**，保存后不一定已上线）。 */
  header: SiteSection[];
  footer: SiteSection[];
  /** 站点级草稿（页头 / 页脚 / 主题）是否领先线上，即有东西待发布。 */
  site_draft_dirty: boolean;
  published: boolean;
  /**
   * 访客访问 `/` 时渲染的逻辑路径。默认 `/`（home 模板）；可改成 `/events` 等
   * 可打开的页面，原地址仍可打开。
   */
  home_path: string;
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
  visibility: MarketingPageVisibility;
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
  visibility: MarketingPageVisibility;
  settings: MarketingPageSettings;
  status: MarketingPageStatus;
  content_dirty: boolean;
  sort_order: number;
  updated_at: string;
}

export interface UpdateMarketingSiteBody {
  site_name?: SiteLocalizedText;
  tagline?: SiteLocalizedText;
  logo_url?: string | null;
  primary_color?: string | null;
  theme_settings?: ThemeSettings;
  default_locale?: string;
  header?: SiteSection[];
  footer?: SiteSection[];
  published?: boolean;
  /** 访客访问 `/` 时渲染的逻辑路径，见 `MarketingSite.home_path`。 */
  home_path?: string;
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
  /** 可见性立即生效（不进草稿列）：改完保存即对公开面生效。 */
  visibility?: MarketingPageVisibility;
  /** 站点级主题草稿；不传表示这次没改主题。 */
  theme_settings?: ThemeSettings;
  /** 本次编辑里套用过主题包时带上，记录新的出发点；不传不动。 */
  theme_key?: string;
}

/** Theme Editor 事务保存的响应：页面与站点 chrome 同批落库。 */
export interface SaveEditorDraftResponse {
  page: MarketingPage;
  site: MarketingSite;
}

/** 页头页脚编辑器的保存体：只写站点 chrome 草稿列。 */
/** 站点级草稿（页头 / 页脚 / 主题）——不带任何页面正文。 */
export interface SaveSiteDraftBody {
  header: unknown;
  footer: unknown;
  /** 不传表示这次没改主题。 */
  theme_settings?: ThemeSettings;
  /** 本次编辑里套用过主题包时带上，记录新的出发点；不传不动。 */
  theme_key?: string;
}

/** 站点级草稿保存的响应。 */
export interface SaveSiteDraftResponse {
  site: MarketingSite;
}

/**
 * 站点当前具备哪些「需要另外开通」的能力。
 *
 * 编辑器里那几个开关本身永远存在（页头就该有账户入口这个位置），但能力具不具备
 * 是租户级的开通状态。不告诉编辑器的话，租户打开开关、预览里看得见按钮，线上却
 * 什么都不出现——三处口径对不上，而且没有任何提示说明为什么。
 */
export interface MarketingSiteCapabilities {
  /** 页头账户入口（登录 / 我的账户）是否可用；未开通会员时为 false。 */
  account_entry: boolean;
  /**
   * 本站已开通的 entitlement。
   *
   * 编辑器拿它过滤「添加区块」菜单里的贡献段：租户没开通就不该列出来——列了也加不出
   * 可用的东西（渲染那边同样会拦，见 `site-entitlements.ts`）。
   */
  entitlements: string[];
  /**
   * 本站是不是默认租户（产品站）。
   *
   * 编辑器拿它过滤声明了 `default_tenant_only` 的段——平台自己的套餐区不该出现在
   * 别人的站点编辑器里（渲染那边同样会拦，见 `sections/html.ts`）。
   */
  is_default_tenant: boolean;
}

export interface UpdateMarketingPageBody {
  slug?: string;
  locale?: string;
  kind?: MarketingPageKind;
  title?: string;
  description?: string;
  sections?: SiteSection[];
  settings?: MarketingPageSettings;
  visibility?: MarketingPageVisibility;
  sort_order?: number;
}

/**
 * 一次写入整批页面的 `sort_order`。
 *
 * 排序是**相对关系**，逐页 PATCH 会把它拆成 N 个各自可能失败的请求，中途断掉就留下
 * 一个谁也没要过的顺序；这里一个事务写完，要么全成要么全不动。
 */
export interface ReorderMarketingPagesBody {
  items: { id: string; sort_order: number }[];
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
  visibility: MarketingPageVisibility;
  /**
   * 公开端点对 `visibility=members` 页只返回摘要时为 true。
   * SSR：访客输出登录门控；有会员 cookie 时解锁正文。
   */
  requires_member?: boolean;
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

export {
  isReservedPageSlug,
  getReservedPageSlugs,
  RESERVED_PAGE_SLUGS,
} from "./reserved-slugs.js";

/**
 * 规范化页面 kind / slug（`home` 与各张模板页都是「kind 唯一、slug 固定」）。
 *
 * 只按**显式的 kind** 认模板页，不按 slug 反推：贡献模块登记的保留 slug
 *（如 site-docs 的 `docs`）会在写入时被拒，而不是悄悄变成一张模板页。
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
  const template = kind ? getPageTemplateKind(kind) : undefined;
  if (template) {
    return { kind: template.kind, slug: template.slug };
  }
  return { kind: "page", slug: trimmed };
}

/**
 * 页面的逻辑路径（不带 locale 前缀）。
 *
 * 模板页返回的可能是一个**模板路径**（如 `/docs/:slug`），不是能打开的地址——
 * 那张页面对应的是「这一类内容的全部详情」，编辑器拿它显示「这一页管的是哪一段
 * 地址」。真实请求由贡献模块的 path handler 拦截，不走页面路径匹配。
 */
export function marketingPagePath(
  kind: MarketingPageKind,
  slug: string,
): string {
  if (kind === "home") return "/";
  const template = getPageTemplateKind(kind);
  if (template) return template.path;
  return `/${slug}`;
}
export type PublicSitePage = PublicMarketingSite["pages"][number];

/** 父路径：`/about/contact` → `/about`；`/about` → `/`。 */
export function pageParentPath(path: string): string {
  const normalized =
    path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  if (normalized === "/" || normalized === "") return "/";
  return normalized.slice(0, normalized.lastIndexOf("/")) || "/";
}

/** 路径深度：`/` → 0，`/about` → 1，`/about/contact` → 2。 */
export function pageDepth(path: string): number {
  return path.split("/").filter(Boolean).length;
}

/**
 * 同级页面：与 `path` 共享同一父路径的所有页面 + 父页面本身。
 *
 * 与页面 kind 无关——`/about/*` 的兄弟是其它自定义页，顶层页的兄弟是其它顶层页。
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
 * 公开目录 / 导航的次序：`sort_order` 主序，`slug` 打破并列。
 *
 * 并列时不能用标题（草稿 vs 已发布、各语言文案会漂），也不能用 `updated_at`
 *（预览会跟「刚改过哪一页」走，实站却按标题排）。slug 是页面身份，预览与
 * 实站、中台列表与公开面共用这一条。
 */
export function comparePublicCatalogPages(
  a: { sort_order: number; slug: string },
  b: { sort_order: number; slug: string },
): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  if (a.slug < b.slug) return -1;
  if (a.slug > b.slug) return 1;
  return 0;
}

/**
 * 全站顶栏导航条目：一级页面（父路径为 `/`，不含首页）。
 *
 * 顺序沿用传入的 `pages`（调用方按 `comparePublicCatalogPages` 排好）。
 * 与 `resolvePageMenu(pages, "/", "children")` 同结果，单独命名方便页头调用。
 */
export function siteNavPages(pages: PublicSitePage[]): PublicSitePage[] {
  return resolvePageMenu(pages, "/", "children").items;
}

/**
 * 解析页面菜单：`page-menu` section 与详情侧栏共用。
 *
 * - `children`：列当前路径下的直接子页（`/about` → `/about/*`）
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

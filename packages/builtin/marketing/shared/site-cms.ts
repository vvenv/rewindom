import { APP_LOCALES, type AppLocale } from "@be-water/shared";

import { DOCS_INDEX_PATH } from "./marketing-doc.js";
import { settingBool } from "./section-settings.js";
import { normalizeSiteColor } from "./site-color.js";
import { navItemsNeedDocs, settingNavItems } from "./site-nav.js";

import type { LocalizedText, SiteSection } from "./section-schema.js";
import type { ThemeSettings } from "./theme-sections.js";

/** 站点级可本地化文案：单语言为纯字符串，多语言为 `__i18n` 表。 */
export type SiteLocalizedText = string | LocalizedText;

/**
 * 页面的种类。
 *
 * `home` / `page` 是租户自己排的普通页面；`doc_index` / `doc_article` 是**文档库的
 * 两张模板页**——版式归租户（同一个编辑器、同一套发布流程），内容归 `MarketingDoc`。
 * 详情模板一张顶所有 `/docs/:slug`：访客点开哪篇，`doc-article` 段就渲哪篇。
 *
 * 模板页在 DB 里可以**不存在**：那时 SSR 用内置预设版式渲染（见 `page-presets.ts`
 * 的 `DOC_TEMPLATE_PRESETS`）。不为每个租户预建两张空页，也就不需要数据迁移。
 */
export type MarketingPageKind = "home" | "page" | "doc_index" | "doc_article";

export const DOC_TEMPLATE_KINDS = ["doc_index", "doc_article"] as const;
export type DocTemplateKind = (typeof DOC_TEMPLATE_KINDS)[number];

/** 模板页的固定 slug：同 `home`——kind 唯一，slug 不由租户填。 */
export const DOC_TEMPLATE_SLUGS: Record<DocTemplateKind, string> = {
  doc_index: "docs",
  doc_article: "docs-article",
};

export function isDocTemplateKind(
  kind: MarketingPageKind,
): kind is DocTemplateKind {
  return kind === "doc_index" || kind === "doc_article";
}
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
}

/** Theme Editor 事务保存的响应：页面与站点 chrome 同批落库。 */
export interface SaveEditorDraftResponse {
  page: MarketingPage;
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

/**
 * 自定义 page slug 的**第一段**不可占用的保留字。
 *
 * `pricing` 刻意**不**保留：绑定域名上的 `/pricing` 归租户自己的页面。
 * `docs` **保留**给租户文档库（`/docs` 索引 + `/docs/:slug` 详情，见
 * `MarketingDoc`）：它是一套独立于页面版式系统的 Markdown 文档库，不进 section 体系。
 */
export const RESERVED_PAGE_SLUGS = new Set([
  // locale 前缀占掉了一级路径：slug 叫 `en` 的顶层页会把整棵 `/en/*` 遮住。
  // slug 在写入前已小写，这里也存小写形态。
  ...APP_LOCALES.map((locale) => locale.slug.toLowerCase()),
  "home",
  /*
   * 应用区一级路径，与 `SITE_APP_PREFIXES` 同源（那边是「交回 SPA」，
   * 这边是「租户不能拿它当页面 slug」）。租户工作台已统一收进 `/app/*`，
   * 所以这里也只剩一个 `app`——`/notes`、`/site` 这些顶层地址还给了租户。
   */
  "app",
  "login",
  "register",
  "auth",
  "member",
  "platform",
  "api",
  "assets",
  "health",
  "sitemap.xml",
  "robots.txt",
  // 租户文档库专属路径，见 MarketingDoc
  "docs",
]);

/**
 * 规范化页面 kind / slug（`home` 与两张文档模板页都是「kind 唯一、slug 固定」）。
 *
 * 只按**显式的 kind** 认模板页，不按 slug 反推：`docs` 在 `RESERVED_PAGE_SLUGS` 里，
 * 租户想建一个叫 `docs` 的普通页应该收到「这个地址被占用了」，而不是莫名其妙拿到
 * 一张文档索引模板。
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
  if (kind === "doc_index" || kind === "doc_article") {
    return { kind, slug: DOC_TEMPLATE_SLUGS[kind] };
  }
  return { kind: "page", slug: trimmed };
}

/**
 * 页面的逻辑路径（不带 locale 前缀）。
 *
 * `doc_article` 返回的是一个**模板路径**（`/docs/:slug`），不是能打开的地址——
 * 那张页面对应的是「所有文档详情」，编辑器拿它显示「这一页管的是哪一段地址」。
 * 真实请求由 `ssr.routes.ts` 在 `/docs/*` 上拦截，不走页面路径匹配。
 */
export function marketingPagePath(
  kind: MarketingPageKind,
  slug: string,
): string {
  if (kind === "home") return "/";
  if (kind === "doc_index") return DOCS_INDEX_PATH;
  if (kind === "doc_article") return `${DOCS_INDEX_PATH}/:slug`;
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

/**
 * 这次渲染要不要先查一趟**完整**文档目录。
 *
 * 页面 / 页头 / 页脚上摆了 `doc-*` 段，或 chrome 导航条目里挂了文档动态项——这两种
 * 都要逐篇的标题与地址才画得出来。
 *
 * 页头的搜索框**不**在此列：它只需要知道「站里有没有文档」，见 `chromeShowsDocSearch`。
 * 而它默认是开的，算进来的话每一次页面渲染都会为一枚按钮拉一遍全库目录。
 */
export function chromeNeedsDocList(site: {
  header: SiteSection[];
  footer: SiteSection[];
}): boolean {
  for (const section of [...site.header, ...site.footer]) {
    if (section.type.startsWith("doc-")) return true;
    if (navItemsNeedDocs(settingNavItems(section.settings))) return true;
    for (const block of section.blocks) {
      if (navItemsNeedDocs(settingNavItems(block.settings))) return true;
    }
  }
  return false;
}

/**
 * 页头是否要渲染文档搜索入口（还要「站里确实有文档」才真的画）。
 *
 * 单独一条是因为它的数据需求便宜得多——一个布尔值，不是整份目录。漏了它的后果是
 * **同一个页头在文档页有搜索框、在别的页上没有**，而文档页恰好总是带着文档数据，
 * 本地随手一看还挺正常。
 */
export function chromeShowsDocSearch(site: { header: SiteSection[] }): boolean {
  return site.header.some(
    (section) =>
      section.type === "header" &&
      settingBool(section.settings, "show_doc_search"),
  );
}

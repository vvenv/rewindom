/**
 * 站点导航条目：嵌在页头设置 / 页脚列块里，**不是**独立可共享实体。
 *
 * 以前有一份 `menus_json` + key 引用——页头页脚「共用同一份」是真需求，但做成
 * 带 key / 齿轮切换的菜单库是过渡设计：租户要问的是「页头上都有什么」，不是
 * 「这份导航叫 main」。现在条目就写在 chrome 里；页脚要和页头一样时**复制**一份。
 *
 * 与 `site-cms` 无依赖（页面目录由调用方以 `{ path, title }` 传入），避免和
 * `import-x/no-cycle` 打架。本文件可以依赖 `section-settings`（LocalizedText）；
 * 反过来 `section-settings` **不得** import 本文件——`nav_items` 的 coerce 只做
 * 数组透传，清洗交给 `safeNavItems`。
 */

import {
  docMessages,
  docPath,
  DOCS_INDEX_PATH,
  groupDocsByCategory,
  type PublicDocSummary,
} from "./marketing-doc.js";
import {
  isLocalizedText,
  resolveLocalizedText,
  type LocalizedText,
  type SettingValues,
} from "./section-settings.js";
import { localizeSiteHref } from "./site-locale.js";

import type { AppLocale } from "@be-water/shared";

/* -------------------------------------------------------------------------- */
/* 存储结构                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 一条导航项的来源。
 *
 * `link` 之外的三种是**动态项**：租户配的是一条规则，展开成哪些链接由内容决定。
 */
export const SITE_NAV_SOURCES = [
  "link",
  "pages",
  "docs",
  "doc_category",
] as const;

export type SiteNavSource = (typeof SITE_NAV_SOURCES)[number];

/**
 * 动态项展开成什么形状。
 *
 * - `children`：收成一个可展开的父项（页头下拉、页脚列里的小标题）
 * - `flat`：就地铺平，与前后的静态项混在同一层
 */
export const SITE_NAV_EXPANDS = ["children", "flat"] as const;
export type SiteNavExpand = (typeof SITE_NAV_EXPANDS)[number];

export interface SiteNavItem {
  id: string;
  source: SiteNavSource;
  /**
   * 显示文案。多语言表与 section 设置同一形状（`{ __i18n: {...} }`）。
   * 动态项留空即用内置文案（如文档库的「文档」），所以只有 `link` 项是必填。
   */
  label: string | LocalizedText;
  /** 仅 `link`：逻辑路径或外链。 */
  href: string;
  /** 仅 `doc_category`：分类 key，与 `MarketingDoc.category` 匹配。 */
  category: string;
  /** 仅动态项。 */
  expand: SiteNavExpand;
  /** 仅 `link`：一层子菜单。 */
  children: SiteNavItem[];
}

const MAX_ITEMS = 40;
const MAX_CHILDREN = 20;
const MAX_LABEL_LENGTH = 80;
const MAX_HREF_LENGTH = 2048;

export function createNavItemId(): string {
  return crypto.randomUUID();
}

/** 换 source 时的默认 expand。 */
export function defaultExpandForSource(source: SiteNavSource): SiteNavExpand {
  return source === "pages" ? "flat" : "children";
}

export function blankNavItem(
  source: SiteNavSource = "link",
): SiteNavItem {
  return {
    id: createNavItemId(),
    source,
    label: "",
    href: "",
    category: "",
    expand: defaultExpandForSource(source),
    children: [],
  };
}

/**
 * 建站默认页头导航：一级页面平铺 + 文档库下拉。
 *
 * 库空时文档那条不渲染（见 `resolveNavItem`）。故意不把 `doc_index` 塞进「全部
 * 一级页面」——模板页不是页面目录成员。
 */
export function defaultHeaderNavItems(): SiteNavItem[] {
  return [
    {
      id: createNavItemId(),
      source: "pages",
      label: "",
      href: "",
      category: "",
      expand: "flat",
      children: [],
    },
    {
      id: createNavItemId(),
      source: "docs",
      label: "",
      href: "",
      category: "",
      expand: "children",
      children: [],
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* 解析                                                                        */
/* -------------------------------------------------------------------------- */

function parseLabel(raw: unknown): string | LocalizedText {
  if (typeof raw === "string") return raw.slice(0, MAX_LABEL_LENGTH);
  if (isLocalizedText(raw)) {
    const table: Record<string, string> = {};
    for (const [locale, text] of Object.entries(raw.__i18n)) {
      if (typeof text === "string") {
        table[locale] = text.slice(0, MAX_LABEL_LENGTH);
      }
    }
    return { __i18n: table };
  }
  return "";
}

function parseSource(raw: unknown): SiteNavSource {
  return (SITE_NAV_SOURCES as readonly string[]).includes(raw as string)
    ? (raw as SiteNavSource)
    : "link";
}

function labelIsEmpty(label: string | LocalizedText): boolean {
  if (typeof label === "string") return label.trim() === "";
  return Object.values(label.__i18n).every((text) => text.trim() === "");
}

function parseItem(raw: unknown, depth: number): SiteNavItem | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const source = parseSource(record.source);
  const label = parseLabel(record.label);
  const href =
    typeof record.href === "string"
      ? record.href.trim().slice(0, MAX_HREF_LENGTH)
      : "";

  /*
   * 空标签的 link **留给编辑器**——否则「添加自定义链接」刚写进 settings，读回来
   * 就被丢掉，租户看到的是点了没反应。公开面由 `resolveNavItem` 再拦一道：
   * 没填完的条目不进页头。
   */
  const children =
    source === "link" && depth === 0 && Array.isArray(record.children)
      ? record.children
          .map((child) => parseItem(child, depth + 1))
          .filter((child): child is SiteNavItem => child !== null)
          .slice(0, MAX_CHILDREN)
      : [];

  return {
    id: typeof record.id === "string" && record.id ? record.id : createNavItemId(),
    source,
    label,
    href: source === "link" ? href : "",
    category:
      source === "doc_category" && typeof record.category === "string"
        ? record.category.trim().slice(0, MAX_LABEL_LENGTH)
        : "",
    expand: record.expand === "flat" ? "flat" : "children",
    children,
  };
}

/**
 * 读库容错：坏条目逐条跳过。
 *
 * 写路径走 `parseNavItems`——形状不对当场拒收。
 */
export function safeNavItems(value: unknown): SiteNavItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => parseItem(raw, 0))
    .filter((item): item is SiteNavItem => item !== null)
    .slice(0, MAX_ITEMS);
}

/** 写路径：非数组 / 超长直接拒收；坏条目与空 link 跳过。 */
export function parseNavItems(value: unknown): SiteNavItem[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("site.nav_items_invalid");
  if (value.length > MAX_ITEMS) throw new Error("site.nav_items_invalid");
  return value
    .map((raw) => parseItem(raw, 0))
    .filter((item): item is SiteNavItem => item !== null);
}

/** 从 section / block settings 取导航条目。 */
export function settingNavItems(
  values: SettingValues,
  id = "items",
): SiteNavItem[] {
  return safeNavItems(values[id]);
}

/** 深拷贝一份条目（页脚「从页头复制」用）；换新 id，避免两处共用同一个 React key。 */
export function cloneNavItems(items: readonly SiteNavItem[]): SiteNavItem[] {
  return items.map((item) => ({
    ...item,
    id: createNavItemId(),
    children: item.children.map((child) => ({
      ...child,
      id: createNavItemId(),
      children: [],
    })),
  }));
}

/* -------------------------------------------------------------------------- */
/* 渲染期展开                                                                  */
/* -------------------------------------------------------------------------- */

export interface SiteNavContext {
  navPages?: readonly { path: string; title: string }[];
  docs?: readonly PublicDocSummary[];
  locale: AppLocale;
  defaultLocale: AppLocale;
  currentPath?: string;
}

export interface ResolvedNavItem {
  key: string;
  label: string;
  /** 空串 = 纯分组标题。 */
  href: string;
  current: boolean;
  children: ResolvedNavItem[];
}

function localizeLabel(
  label: string | LocalizedText,
  ctx: SiteNavContext,
): string {
  return typeof label === "string"
    ? label
    : resolveLocalizedText(label, ctx.locale, ctx.defaultLocale);
}

function makeLink(
  key: string,
  label: string,
  logicalPath: string,
  ctx: SiteNavContext,
  children: ResolvedNavItem[] = [],
): ResolvedNavItem {
  return {
    key,
    label,
    href: logicalPath
      ? localizeSiteHref(logicalPath, ctx.locale, ctx.defaultLocale)
      : "",
    current: logicalPath !== "" && logicalPath === ctx.currentPath,
    children,
  };
}

function docItems(
  docs: readonly PublicDocSummary[],
  ctx: SiteNavContext,
  keyPrefix: string,
): ResolvedNavItem[] {
  return docs.map((doc) =>
    makeLink(`${keyPrefix}:${doc.slug}`, doc.title, docPath(doc.slug), ctx),
  );
}

function resolveItem(
  item: SiteNavItem,
  ctx: SiteNavContext,
): ResolvedNavItem[] {
  const label = localizeLabel(item.label, ctx);

  switch (item.source) {
    case "link": {
      // 没填标签的草稿条目不进公开导航（编辑器里仍保留，见 parseItem）
      if (labelIsEmpty(item.label)) return [];
      if (!item.href && item.children.length === 0) return [];
      const children = item.children.flatMap((child) =>
        resolveItem(child, ctx),
      );
      return [makeLink(item.id, label, item.href, ctx, children)];
    }

    case "pages": {
      const pages = ctx.navPages ?? [];
      if (pages.length === 0) return [];
      const items = pages.map((page) =>
        makeLink(`${item.id}:${page.path}`, page.title, page.path, ctx),
      );
      return item.expand === "flat"
        ? items
        : [makeLink(item.id, label, "", ctx, items)];
    }

    case "docs": {
      const docs = ctx.docs ?? [];
      const messages = docMessages(ctx.locale);
      if (docs.length === 0) return [];
      if (item.expand === "flat") {
        return docItems(docs, ctx, item.id);
      }
      const groups = groupDocsByCategory(docs);
      const children =
        groups.length > 1
          ? groups.flatMap((group) =>
              group.category
                ? [
                    {
                      key: `${item.id}:${group.category}`,
                      label: group.category,
                      href: "",
                      current: false,
                      children: docItems(
                        group.items,
                        ctx,
                        `${item.id}:${group.category}`,
                      ),
                    },
                  ]
                : docItems(group.items, ctx, item.id),
            )
          : docItems(docs, ctx, item.id);
      return [
        makeLink(item.id, label || messages.nav, DOCS_INDEX_PATH, ctx, children),
      ];
    }

    case "doc_category": {
      const docs = (ctx.docs ?? []).filter(
        (doc) => doc.category === item.category,
      );
      if (docs.length === 0) return [];
      const items = docItems(docs, ctx, item.id);
      const fallbackLabel =
        docs[0]?.category_label?.trim() || item.category;
      return item.expand === "flat"
        ? items
        : [makeLink(item.id, label || fallbackLabel, "", ctx, items)];
    }

    default:
      return [];
  }
}

/** 展开单条——编辑器就地预览用。 */
export function resolveNavItem(
  item: SiteNavItem,
  ctx: SiteNavContext,
): ResolvedNavItem[] {
  return resolveItem(item, ctx);
}

/** 展开一整列导航条目。 */
export function resolveNavItems(
  items: readonly SiteNavItem[],
  ctx: SiteNavContext,
): ResolvedNavItem[] {
  return items.flatMap((item) => resolveItem(item, ctx));
}

export function navItemsNeedDocs(items: readonly SiteNavItem[]): boolean {
  const needsDocs = (item: SiteNavItem): boolean =>
    item.source === "docs" ||
    item.source === "doc_category" ||
    item.children.some(needsDocs);
  return items.some(needsDocs);
}

/**
 * 换来源时要一起写进去的补丁：清掉上一种来源专属字段，并套上默认 expand。
 */
export function navItemSourcePatch(
  source: SiteNavSource,
): Partial<SiteNavItem> {
  return {
    source,
    expand: defaultExpandForSource(source),
    ...(source === "link" ? {} : { href: "", children: [] }),
    ...(source === "doc_category" ? {} : { category: "" }),
  };
}

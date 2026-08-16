/**
 * 站点导航条目：嵌在页头设置 / 页脚列块里，**不是**独立可共享实体。
 *
 * 内核只认识 `link`（手填）和 `pages`（一级页面目录）。其它动态源由业务模块
 * `registerNavSource` 填进来——marketing 展开时按表调度，不 import 文档库。
 *
 * 与 `site-cms` 无依赖（页面目录由调用方以 `{ path, title }` 传入）。
 */

import {
  isLocalizedText,
  resolveLocalizedText,
  type LocalizedText,
  type SettingValues,
} from "./section-settings.js";
import { localizeSiteHref, parseSiteLocalePath } from "./site-locale.js";

import type { AppLocale } from "@rewindom/shared";

export const BUILTIN_NAV_SOURCES = ["link", "pages"] as const;
export type BuiltinNavSource = (typeof BUILTIN_NAV_SOURCES)[number];

/** 一条导航项的来源。内置两项 + 贡献源（`site-docs` 等）。 */
export type SiteNavSource = string;

export const SITE_NAV_EXPANDS = ["children", "flat"] as const;
export type SiteNavExpand = (typeof SITE_NAV_EXPANDS)[number];

export interface SiteNavItem {
  id: string;
  source: SiteNavSource;
  label: string | LocalizedText;
  href: string;
  /** 贡献源需要一个分类 key 时用。 */
  category: string;
  expand: SiteNavExpand;
  children: SiteNavItem[];
}

export interface SiteNavContext {
  navPages?: readonly { path: string; title: string }[];
  locale: AppLocale;
  defaultLocale: AppLocale;
  currentPath?: string;
  contributed?: Readonly<Record<string, unknown>>;
  /**
   * 本站已开通的贡献能力。声明了 `entitlement` 的导航源没在集合里就不展开。
   * 漏传按未开通算——页头里残留的「文档库」条目关模块后必须消失。
   */
  enabledEntitlements?: ReadonlySet<string>;
}

export interface ResolvedNavItem {
  key: string;
  label: string;
  href: string;
  current: boolean;
  children: ResolvedNavItem[];
}

export interface NavCategoryOption {
  key: string;
  label: string;
}

export interface NavSourceDefinition {
  source: string;
  /** i18n key，可带命名空间。 */
  label: string;
  defaultLabel?: string;
  entitlement?: string;
  defaultExpand?: SiteNavExpand;
  usesCategory?: boolean;
  /**
   * `usesCategory` 源在编辑器里的分类下拉选项，从**自己那一格** `contributed`
   * 里取。marketing 不认识任何业务模块的数据形状——文档分类与商店分类只有贡献方
   * 自己知道长什么样，不填就是没得选（下拉置灰）。
   */
  categoryOptions?: (
    contributed: Readonly<Record<string, unknown>> | undefined,
  ) => NavCategoryOption[];
  expand: (item: SiteNavItem, ctx: SiteNavContext) => ResolvedNavItem[];
}

const CONTRIBUTED = new Map<string, NavSourceDefinition>();

/** 存量数据：旧内置源 → 贡献源。解析时改写一次，不是双读。 */
const NAV_SOURCE_ALIASES: Record<string, string> = {
  docs: "site-docs",
  doc_category: "site-docs.category",
};

export function registerNavSource(definition: NavSourceDefinition): void {
  if ((BUILTIN_NAV_SOURCES as readonly string[]).includes(definition.source)) {
    throw new Error(`site.nav_source_conflict:${definition.source}`);
  }
  const existing = CONTRIBUTED.get(definition.source);
  if (existing && existing !== definition) {
    throw new Error(`site.nav_source_conflict:${definition.source}`);
  }
  CONTRIBUTED.set(definition.source, definition);
}

export function resetNavSourceContributions(): void {
  CONTRIBUTED.clear();
}

export function getNavSource(source: string): NavSourceDefinition | undefined {
  return CONTRIBUTED.get(source);
}

export function listNavSources(enabled?: ReadonlySet<string>): string[] {
  const contributed = [...CONTRIBUTED.values()]
    .filter((def) => !def.entitlement || enabled?.has(def.entitlement) === true)
    .map((def) => def.source);
  return [...BUILTIN_NAV_SOURCES, ...contributed];
}

/** 某个源在编辑器里可选的分类；不是分类源、或贡献方没给，都是空列表。 */
export function navSourceCategoryOptions(
  source: string,
  contributed: Readonly<Record<string, unknown>> | undefined,
): NavCategoryOption[] {
  const def = getNavSource(source);
  if (!def?.usesCategory || !def.categoryOptions) return [];
  return def.categoryOptions(contributed);
}

/** 贡献导航源声明过的 entitlement（公开渲染要去查开关，不能只扫段定义）。 */
export function contributedNavEntitlementKeys(): string[] {
  return [
    ...new Set(
      [...CONTRIBUTED.values()]
        .map((def) => def.entitlement)
        .filter((key): key is string => Boolean(key)),
    ),
  ];
}

/** 未过滤的内置源（编辑器在 entitlement 集合尚未返回时只露出这两项）。 */
export const SITE_NAV_SOURCES: readonly string[] = BUILTIN_NAV_SOURCES;

const MAX_ITEMS = 40;
const MAX_CHILDREN = 20;
const MAX_LABEL_LENGTH = 80;
const MAX_HREF_LENGTH = 2048;

export function createNavItemId(): string {
  return crypto.randomUUID();
}

export function defaultExpandForSource(source: SiteNavSource): SiteNavExpand {
  if (source === "pages") return "flat";
  return getNavSource(source)?.defaultExpand ?? "children";
}

export function blankNavItem(source: SiteNavSource = "link"): SiteNavItem {
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
  ];
}

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
  if (typeof raw !== "string" || !raw.trim()) return "link";
  return NAV_SOURCE_ALIASES[raw] ?? raw.trim();
}

function parseItem(raw: unknown, depth: number): SiteNavItem | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const source = parseSource(record.source);
  const label = parseLabel(record.label);
  const href =
    typeof record.href === "string"
      ? record.href.trim().slice(0, MAX_HREF_LENGTH)
      : "";
  const usesCategory = getNavSource(source)?.usesCategory === true;

  const children =
    source === "link" && depth === 0 && Array.isArray(record.children)
      ? record.children
          .map((child) => parseItem(child, depth + 1))
          .filter((child): child is SiteNavItem => child !== null)
          .slice(0, MAX_CHILDREN)
      : [];

  return {
    id:
      typeof record.id === "string" && record.id
        ? record.id
        : createNavItemId(),
    source,
    label,
    href: source === "link" ? href : "",
    category:
      usesCategory && typeof record.category === "string"
        ? record.category.trim().slice(0, MAX_LABEL_LENGTH)
        : "",
    expand: record.expand === "flat" ? "flat" : "children",
    children,
  };
}

export function safeNavItems(value: unknown): SiteNavItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => parseItem(raw, 0))
    .filter((item): item is SiteNavItem => item !== null)
    .slice(0, MAX_ITEMS);
}

export function parseNavItems(value: unknown): SiteNavItem[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("site.nav_items_invalid");
  if (value.length > MAX_ITEMS) throw new Error("site.nav_items_invalid");
  return value
    .map((raw) => parseItem(raw, 0))
    .filter((item): item is SiteNavItem => item !== null);
}

export function settingNavItems(
  values: SettingValues,
  id = "items",
): SiteNavItem[] {
  return safeNavItems(values[id]);
}

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

export function makeNavLink(
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

/**
 * 当前语言填过的标签。纯字符串只算站点默认语言的原文——和 chrome 其它字段一样，
 * 别把中文「关于」当成英文菜单。
 */
function explicitNavLabel(
  label: string | LocalizedText,
  ctx: Pick<SiteNavContext, "locale" | "defaultLocale">,
): string {
  if (typeof label === "string") {
    return ctx.locale === ctx.defaultLocale ? label.trim() : "";
  }
  const current = label.__i18n[ctx.locale];
  return typeof current === "string" ? current.trim() : "";
}

function fallbackNavLabel(
  label: string | LocalizedText,
  ctx: Pick<SiteNavContext, "locale" | "defaultLocale">,
): string {
  return typeof label === "string"
    ? label.trim()
    : resolveLocalizedText(label, ctx.locale, ctx.defaultLocale).trim();
}

function catalogTitleForHref(href: string, ctx: SiteNavContext): string {
  if (!href.startsWith("/") || href.startsWith("//")) return "";
  const path = parseSiteLocalePath(
    href.split(/[?#]/u)[0] ?? href,
    ctx.defaultLocale,
  ).path;
  return ctx.navPages?.find((page) => page.path === path)?.title.trim() ?? "";
}

const STOCK_NAV_LABELS = new Set(["商品", "Products", "商店", "Shop"]);

/**
 * 菜单文案：当前语言标签 → 同路径页面标题 → 默认语言回落。
 *
 * 一级页面已经按语言各有标题；链到这些页面的菜单项不必再填一遍翻译。
 * 复制到英文时标签槽里经常还留着「商品」——那是库存译名，让位给当前语言的
 * 页面标题，否则页头会永远停在中文。
 */
export function resolveNavLabel(
  label: string | LocalizedText,
  ctx: SiteNavContext,
  href = "",
): string {
  const explicit = explicitNavLabel(label, ctx);
  const catalog = catalogTitleForHref(href, ctx);
  if (catalog && STOCK_NAV_LABELS.has(explicit) && explicit !== catalog) {
    return catalog;
  }
  return explicit || catalog || fallbackNavLabel(label, ctx);
}

function resolveItem(
  item: SiteNavItem,
  ctx: SiteNavContext,
): ResolvedNavItem[] {
  if (item.source === "link") {
    if (!item.href && item.children.length === 0) return [];
    const children = item.children.flatMap((child) => resolveItem(child, ctx));
    const label = resolveNavLabel(item.label, ctx, item.href);
    if (!label && children.length === 0) return [];
    return [makeNavLink(item.id, label, item.href, ctx, children)];
  }

  if (item.source === "pages") {
    const pages = ctx.navPages ?? [];
    if (pages.length === 0) return [];
    const items = pages.map((page) =>
      makeNavLink(`${item.id}:${page.path}`, page.title, page.path, ctx),
    );
    return item.expand === "flat"
      ? items
      : [
          makeNavLink(
            item.id,
            resolveNavLabel(item.label, ctx),
            "",
            ctx,
            items,
          ),
        ];
  }

  const contributed = getNavSource(item.source);
  if (!contributed) return [];
  if (
    contributed.entitlement &&
    ctx.enabledEntitlements?.has(contributed.entitlement) !== true
  ) {
    return [];
  }
  return contributed.expand(item, ctx);
}

export function resolveNavItem(
  item: SiteNavItem,
  ctx: SiteNavContext,
): ResolvedNavItem[] {
  return resolveItem(item, ctx);
}

export function resolveNavItems(
  items: readonly SiteNavItem[],
  ctx: SiteNavContext,
): ResolvedNavItem[] {
  return items.flatMap((item) => resolveItem(item, ctx));
}

export function navItemsNeedSource(
  items: readonly SiteNavItem[],
  source: string,
): boolean {
  const matches = (item: SiteNavItem): boolean =>
    item.source === source || item.children.some(matches);
  return items.some(matches);
}

export function navItemSourcePatch(
  source: SiteNavSource,
): Partial<SiteNavItem> {
  const def = getNavSource(source);
  return {
    source,
    expand: defaultExpandForSource(source),
    ...(source === "link" ? {} : { href: "", children: [] }),
    ...(def?.usesCategory ? {} : { category: "" }),
  };
}

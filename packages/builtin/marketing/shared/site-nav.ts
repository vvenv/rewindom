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
import { localizeSiteHref } from "./site-locale.js";

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
}

export interface ResolvedNavItem {
  key: string;
  label: string;
  href: string;
  current: boolean;
  children: ResolvedNavItem[];
}

export interface NavSourceDefinition {
  source: string;
  /** i18n key，可带命名空间。 */
  label: string;
  defaultLabel?: string;
  entitlement?: string;
  defaultExpand?: SiteNavExpand;
  usesCategory?: boolean;
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

export function getNavSource(
  source: string,
): NavSourceDefinition | undefined {
  return CONTRIBUTED.get(source);
}

export function listNavSources(
  enabled?: ReadonlySet<string>,
): string[] {
  const contributed = [...CONTRIBUTED.values()]
    .filter(
      (def) =>
        !def.entitlement || !enabled || enabled.has(def.entitlement),
    )
    .map((def) => def.source);
  return [...BUILTIN_NAV_SOURCES, ...contributed];
}

/** 未过滤的全表（编辑器「添加」菜单在拿到 entitlement 集合前用）。 */
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

function labelIsEmpty(label: string | LocalizedText): boolean {
  if (typeof label === "string") return label.trim() === "";
  return Object.values(label.__i18n).every((text) => text.trim() === "");
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

function localizeLabel(
  label: string | LocalizedText,
  ctx: SiteNavContext,
): string {
  return typeof label === "string"
    ? label
    : resolveLocalizedText(label, ctx.locale, ctx.defaultLocale);
}

function resolveItem(
  item: SiteNavItem,
  ctx: SiteNavContext,
): ResolvedNavItem[] {
  const label = localizeLabel(item.label, ctx);

  if (item.source === "link") {
    if (labelIsEmpty(item.label)) return [];
    if (!item.href && item.children.length === 0) return [];
    const children = item.children.flatMap((child) => resolveItem(child, ctx));
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
      : [makeNavLink(item.id, label, "", ctx, items)];
  }

  const contributed = getNavSource(item.source);
  if (!contributed) return [];
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

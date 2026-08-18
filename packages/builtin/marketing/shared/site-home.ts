/**
 * 站点首页：访客打开 `/` 时看到什么。
 *
 * 设置里是**一个**下拉：首页模板的各套版式，加上其它可打开的页面。
 * 选版式 → 套到 `kind: home` 那一行，`home_path` 回到 `/`。
 * 选另一张页（店面、关于我们）→ `home_path` 改写 `/` 去渲染那一页。
 *
 * 贡献版式可以声明 `rootPrefix`（如 `/events`）：选择器不再把该枢纽列为
 * 「把某页设为首页」，公开前缀是否收到根上由模块按 `home_layout_key` 判定。
 * 存量 `home_path=/events` 仍能改写 `/`（数据不能凭空失效）。
 *
 * 不走 30x 改写 `/`：首页 URL 必须还是站点根，搜索引擎与页头品牌链都指这里。
 */

import {
  DEFAULT_HOME_LAYOUT_KEY,
  listHomeLayouts,
  type HomeLayoutDefinition,
} from "./home-layouts.js";
import {
  getPageTemplateKind,
  HOME_PAGE_KIND,
  isPageTemplateRelevant,
  listPageTemplateKinds,
  NOT_FOUND_PAGE_KIND,
} from "./page-templates.js";
import { marketingPagePath } from "./site-cms.js";

export const DEFAULT_HOME_PATH = "/";

export function normalizeHomePath(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "/") return DEFAULT_HOME_PATH;
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith("/")
    ? withSlash.slice(0, -1)
    : withSlash;
}

/**
 * 能不能当首页：具体地址、不是 404、不是详情模板（路径里带 `:param`）。
 */
export function isHomeablePath(path: string): boolean {
  const normalized = normalizeHomePath(path);
  if (normalized === DEFAULT_HOME_PATH) return true;
  if (!normalized.startsWith("/") || normalized.includes(":")) return false;
  const template = templateByPath(normalized);
  if (template?.kind === NOT_FOUND_PAGE_KIND) return false;
  return true;
}

/**
 * 这张模板现在能不能当首页（开关关掉的 `/shop` `/events` 不行）。
 *
 * 普通页面没有模板登记，调用方自己确认页面存在。
 */
export function isHomePathAvailable(
  path: string,
  entitlements: ReadonlySet<string>,
): boolean {
  const normalized = normalizeHomePath(path);
  if (!isHomeablePath(normalized)) return false;
  if (normalized === DEFAULT_HOME_PATH) return true;
  const template = templateByPath(normalized);
  if (!template) return true;
  return isPageTemplateRelevant(template, entitlements);
}

export interface HomeablePageOption {
  path: string;
  title: string;
  kind: string;
}

/**
 * 外观预览要对着真实首页：从页面列表里找出 `home_path` 对应的那一行。
 *
 * 优先当前编辑语言；没有译文再退回任意一种语言。找不到就让预览只剩页头页脚——
 * 站点可以一张页面都没有，外观仍然要能配。
 */
export function pageIdAtHomePath(
  pages: readonly {
    id: string;
    kind: string;
    slug: string;
    locale: string;
  }[],
  homePath: string,
  locale: string,
): string | undefined {
  const path = normalizeHomePath(homePath);
  const matches = pages.filter(
    (page) => marketingPagePath(page.kind, page.slug) === path,
  );
  return matches.find((page) => page.locale === locale)?.id ?? matches[0]?.id;
}

/**
 * 设置里的首页候选：`/` 永远在第一项，其余按路径排。
 *
 * 同一路径多语言只留一行，标题优先主语言那份。
 */
export function listHomeablePageOptions(
  pages: readonly {
    kind: string;
    slug: string;
    title: string;
    locale: string;
  }[],
  defaultLocale: string,
  entitlements: ReadonlySet<string>,
): HomeablePageOption[] {
  const byPath = new Map<string, HomeablePageOption>();
  for (const page of pages) {
    const path = marketingPagePath(page.kind, page.slug);
    if (!isHomeablePath(path)) continue;
    const template = getPageTemplateKind(page.kind);
    if (template && !isPageTemplateRelevant(template, entitlements)) continue;
    const existing = byPath.get(path);
    if (!existing || page.locale === defaultLocale) {
      byPath.set(path, { path, title: page.title, kind: page.kind });
    }
  }
  if (!byPath.has(DEFAULT_HOME_PATH)) {
    byPath.set(DEFAULT_HOME_PATH, {
      path: DEFAULT_HOME_PATH,
      title: "",
      kind: HOME_PAGE_KIND,
    });
  }
  const home = byPath.get(DEFAULT_HOME_PATH)!;
  const rest = [...byPath.values()]
    .filter((option) => option.path !== DEFAULT_HOME_PATH)
    .sort((a, b) => a.path.localeCompare(b.path));
  return [home, ...rest];
}

export const HOME_SELECTOR_LAYOUT_PREFIX = "layout:";
export const HOME_SELECTOR_PAGE_PREFIX = "page:";

export type HomeSelectorOption =
  | { type: "layout"; key: string; label: string; description?: string }
  | { type: "page"; path: string; title: string; kind: string };

export function encodeHomeSelectorLayout(key: string): string {
  return `${HOME_SELECTOR_LAYOUT_PREFIX}${key}`;
}

export function encodeHomeSelectorPage(path: string): string {
  return `${HOME_SELECTOR_PAGE_PREFIX}${normalizeHomePath(path)}`;
}

export function parseHomeSelectorValue(
  value: string,
):
  | { type: "layout"; key: string }
  | { type: "page"; path: string }
  | null {
  if (value.startsWith(HOME_SELECTOR_LAYOUT_PREFIX)) {
    const key = value.slice(HOME_SELECTOR_LAYOUT_PREFIX.length);
    return key ? { type: "layout", key } : null;
  }
  if (value.startsWith(HOME_SELECTOR_PAGE_PREFIX)) {
    const path = value.slice(HOME_SELECTOR_PAGE_PREFIX.length);
    return path ? { type: "page", path: normalizeHomePath(path) } : null;
  }
  return null;
}

/**
 * 这条路径是不是某套已开通版式声明的枢纽前缀（选择器里用版式代替「设为该页」）。
 */
export function homeLayoutReplacingPath(
  path: string,
  entitlements: ReadonlySet<string>,
): HomeLayoutDefinition | undefined {
  const normalized = normalizeHomePath(path);
  return listHomeLayouts(entitlements).find(
    (layout) =>
      layout.rootPrefix !== undefined &&
      normalizeHomePath(layout.rootPrefix) === normalized,
  );
}

/**
 * 设置里的首页下拉：版式在前，其余可打开的页在后。
 *
 * `/` 由版式代表，不再单列「默认首页」。声明了 `rootPrefix` 的枢纽也不进页面项。
 */
export function listHomeSelectorOptions(
  pages: readonly {
    kind: string;
    slug: string;
    title: string;
    locale: string;
  }[],
  defaultLocale: string,
  entitlements: ReadonlySet<string>,
): HomeSelectorOption[] {
  const layouts = listHomeLayouts(entitlements);
  const replaced = new Set(
    layouts
      .map((layout) =>
        layout.rootPrefix ? normalizeHomePath(layout.rootPrefix) : "",
      )
      .filter(Boolean),
  );
  const pagesOptions = listHomeablePageOptions(
    pages,
    defaultLocale,
    entitlements,
  ).filter(
    (option) =>
      option.path !== DEFAULT_HOME_PATH && !replaced.has(option.path),
  );
  return [
    ...layouts.map((layout) => ({
      type: "layout" as const,
      key: layout.key,
      label: layout.label,
      description: layout.description,
    })),
    ...pagesOptions.map((option) => ({
      type: "page" as const,
      path: option.path,
      title: option.title,
      kind: option.kind,
    })),
  ];
}

/**
 * 当前设置对应选择器里哪一项。
 *
 * 存量 `home_path` 等于某套版式的 `rootPrefix` 时，显示为已选该版式
 *（不自动改库；下次改选择器才套首页草稿）。
 */
export function homeSelectorValue(
  homePath: string,
  homeLayoutKey: string,
  entitlements: ReadonlySet<string>,
): string {
  const path = normalizeHomePath(homePath);
  const layouts = listHomeLayouts(entitlements);
  const replaced = homeLayoutReplacingPath(path, entitlements);
  if (replaced) return encodeHomeSelectorLayout(replaced.key);
  if (path === DEFAULT_HOME_PATH) {
    const key = layouts.some((layout) => layout.key === homeLayoutKey)
      ? homeLayoutKey
      : DEFAULT_HOME_LAYOUT_KEY;
    return encodeHomeSelectorLayout(key);
  }
  return encodeHomeSelectorPage(path);
}

/** 页面列表「首页」徽章：这条路径现在是不是访客打开 / 时渲染的那张页。 */
export function isSiteHomePage(
  pagePath: string,
  homePath: string,
): boolean {
  return normalizeHomePath(pagePath) === normalizeHomePath(homePath);
}

/**
 * 行菜单能不能「设为首页」。
 *
 * 已经是当前首页、或这条路径已被选中的版式接管（枢纽不再当首页入口），都不出。
 */
export function canSetPageAsHome(input: {
  pagePath: string;
  homePath: string;
  homeLayoutKey: string;
  entitlements: ReadonlySet<string>;
}): boolean {
  if (!isHomeablePath(input.pagePath)) return false;
  if (isSiteHomePage(input.pagePath, input.homePath)) return false;
  const replacing = homeLayoutReplacingPath(
    input.pagePath,
    input.entitlements,
  );
  if (
    replacing &&
    normalizeHomePath(input.homePath) === DEFAULT_HOME_PATH &&
    input.homeLayoutKey === replacing.key
  ) {
    return false;
  }
  return true;
}

function templateByPath(path: string) {
  return listPageTemplateKinds().find((template) => template.path === path);
}

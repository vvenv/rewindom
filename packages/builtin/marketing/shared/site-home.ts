/**
 * 站点首页：哪张页面占据 `/`。
 *
 * 默认仍是 `home` 模板（路径 `/`）。租户可以把另一张**可打开**的页面指定为首页
 *（例如事件枢纽 `/events`）——访客访问 `/` 时渲染那一页的内容，原地址照常可打开。
 *
 * 不走 30x：首页 URL 必须还是站点根，搜索引擎与页头品牌链都指这里。
 */

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

function templateByPath(path: string) {
  return listPageTemplateKinds().find((template) => template.path === path);
}

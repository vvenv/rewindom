/**
 * 文档库列表的纯辅助：分类归集、slug 联动、筛选语义单测。
 *
 * 管理端列表已走服务端筛选 / 分页（`listDocs`）；这里的 `filterSiteDocs` /
 * `sortSiteDocs` 仍保留，用来钉住与服务端一致的筛选语义，并给编辑器目录复用
 * `collectDocCategories` 等。
 */

import { APP_LOCALES, type AppLocale } from "@rewindom/shared";

import type { MarketingDocListItem } from "../../shared/marketing-doc.js";

/** 状态筛选：除了 draft / published，还要能单独捞出「已发布但草稿有改动」的。 */
export const SITE_DOC_STATUS_FILTERS = ["published", "draft", "dirty"] as const;

export type SiteDocStatusFilter = (typeof SITE_DOC_STATUS_FILTERS)[number];

export interface SiteDocFilterState {
  q?: string;
  category?: string;
  status?: string;
  locale?: string;
}

export function isSiteDocStatusFilter(
  value: string | undefined,
): value is SiteDocStatusFilter {
  return (
    value !== undefined &&
    (SITE_DOC_STATUS_FILTERS as readonly string[]).includes(value)
  );
}

/** 列表里出现过的分类，按字典序去重；空分类不算一项（由「全部」覆盖）。 */
export function collectDocCategories(
  docs: readonly MarketingDocListItem[],
): string[] {
  const seen = new Set<string>();
  for (const doc of docs) {
    if (doc.category) seen.add(doc.category);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

/**
 * 列表里出现过的语言，按 `APP_LOCALES` 的顺序。
 *
 * 同一个 slug 每种语言各一行，只有一种语言时整列都是同一个值——那时列与筛选都不画，
 * 单语言站点不该为一个恒定值让出一列宽度。
 */
export function collectDocLocales(
  docs: readonly MarketingDocListItem[],
): AppLocale[] {
  const seen = new Set<string>(docs.map((doc) => doc.locale));
  return APP_LOCALES.map((locale) => locale.slug).filter((slug) =>
    seen.has(slug),
  );
}

/** 搜索命中标题 / 路径 / 摘要 / 分类任一即可——用户记得住哪个是哪个不好说。 */
export function matchesDocQuery(
  doc: MarketingDocListItem,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [doc.title, doc.slug, doc.description, doc.category].some((field) =>
    field.toLowerCase().includes(needle),
  );
}

export function filterSiteDocs(
  docs: readonly MarketingDocListItem[],
  filters: SiteDocFilterState,
): MarketingDocListItem[] {
  return docs.filter((doc) => {
    if (filters.q && !matchesDocQuery(doc, filters.q)) return false;
    if (filters.category && doc.category !== filters.category) return false;
    if (filters.locale && doc.locale !== filters.locale) return false;
    switch (filters.status) {
      case "published":
        return doc.status === "published";
      case "draft":
        return doc.status === "draft";
      case "dirty":
        return doc.content_dirty;
      default:
        return true;
    }
  });
}

export function hasActiveDocFilters(filters: SiteDocFilterState): boolean {
  return Boolean(
    filters.q ?? filters.category ?? filters.status ?? filters.locale,
  );
}

/** 与表格列 accessorKey 对齐的可排序字段。 */
export const SITE_DOC_SORTABLE_FIELDS = [
  "title",
  "slug",
  "category",
  "locale",
  "status",
  "updated_at",
] as const;

export type SiteDocSortField = (typeof SITE_DOC_SORTABLE_FIELDS)[number];

function isSiteDocSortField(value: string | undefined): value is SiteDocSortField {
  return (
    value !== undefined &&
    (SITE_DOC_SORTABLE_FIELDS as readonly string[]).includes(value)
  );
}

/**
 * 客户端排序：接口一次返回全量，排序也在本地做，口径跟 URL `sort_by` / `sort_dir` 一致。
 */
export function sortSiteDocs(
  docs: readonly MarketingDocListItem[],
  sortBy?: string,
  sortDir?: "asc" | "desc",
): MarketingDocListItem[] {
  if (!isSiteDocSortField(sortBy)) return [...docs];
  const direction = sortDir === "asc" ? 1 : -1;
  return [...docs].sort((left, right) => {
    const a = left[sortBy];
    const b = right[sortBy];
    if (typeof a === "boolean" && typeof b === "boolean") {
      return (Number(a) - Number(b)) * direction;
    }
    return String(a).localeCompare(String(b), undefined, { numeric: true }) * direction;
  });
}

/** 按 URL 的 page / page_size 切一页；page 越界时夹到末页，避免筛完后停在空白页。 */
export function paginateSiteDocs(
  docs: readonly MarketingDocListItem[],
  page: number,
  pageSize: number,
): {
  items: MarketingDocListItem[];
  total: number;
  page: number;
  page_count: number;
} {
  const total = docs.length;
  const page_count = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), page_count);
  const start = (safePage - 1) * pageSize;
  return {
    items: docs.slice(start, start + pageSize),
    total,
    page: safePage,
    page_count,
  };
}

/**
 * 标题 → slug 候选（新建时联动填充）。
 *
 * 口径跟 `validateDocSlug` 对齐：只留 a-z0-9 与连字符、首尾必须是字母数字、最长 63。
 * 中文标题会被剥成空串——那时候留空让用户自己填，胡乱音译只会得到没人认得的路径。
 */
export function slugifyDocTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+/u, "")
    .slice(0, 63)
    .replace(/-+$/u, "");
}

/** 触发浏览器下载一段 markdown 文本。 */
export function downloadMarkdownFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    anchor.remove();
  }, 1000);
}

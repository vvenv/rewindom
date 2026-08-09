/**
 * 文档库列表页的纯逻辑：筛选、分类归集、slug 联动。
 *
 * 文档列表接口一次返回全量（一个租户几十上百篇，不分页），所以搜索/筛选都在客户端
 * 做——比为三个筛选项去服务端加一轮查询参数划算。真到需要分页那天，这里的签名
 * 正好是服务端查询参数的形状。
 */

import type { MarketingDocListItem } from "../../shared/marketing-doc.js";

/** 状态筛选：除了 draft / published，还要能单独捞出「已发布但草稿有改动」的。 */
export const SITE_DOC_STATUS_FILTERS = ["published", "draft", "dirty"] as const;

export type SiteDocStatusFilter = (typeof SITE_DOC_STATUS_FILTERS)[number];

export interface SiteDocFilterState {
  q?: string;
  category?: string;
  status?: string;
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
  return Boolean(filters.q ?? filters.category ?? filters.status);
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

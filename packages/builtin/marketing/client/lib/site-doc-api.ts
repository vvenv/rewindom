import { api } from "@be-water/client-kit";

import type {
  CreateMarketingDocBody,
  DuplicateMarketingDocBody,
  MarketingDoc,
  MarketingDocListItem,
  MarketingDocListQuery,
  MarketingDocListResult,
  UpdateMarketingDocBody,
} from "../../shared/marketing-doc.js";
import type {
  CreateMarketingDocCategoryBody,
  MarketingDocCategory,
  ReorderMarketingDocCategoriesBody,
  UpdateMarketingDocCategoryBody,
} from "../../shared/marketing-doc-category.js";

export const SITE_DOCS_QUERY_KEY = ["site", "docs"] as const;

/** 编辑器 / 页头预览用的「近似全量」目录上限。 */
export const SITE_DOCS_CATALOG_PAGE_SIZE = 999;

export function fetchSiteDocs(
  query: MarketingDocListQuery = {},
): Promise<MarketingDocListResult> {
  const params: Record<string, string | number> = {};
  if (query.q) params.q = query.q;
  if (query.category) params.category = query.category;
  if (query.status) params.status = query.status;
  if (query.locale) params.locale = query.locale;
  if (query.page !== undefined) params.page = query.page;
  if (query.page_size !== undefined) params.page_size = query.page_size;
  if (query.sort_by) params.sort_by = query.sort_by;
  if (query.sort_dir) params.sort_dir = query.sort_dir;
  return api.get<MarketingDocListResult>("/site/docs", params);
}

/** 需要整库目录时用（分类建议、翻译组、页头文档导航）。 */
export function fetchSiteDocsCatalog(): Promise<{
  items: MarketingDocListItem[];
  category_catalog: MarketingDocCategory[];
}> {
  return fetchSiteDocs({
    page: 1,
    page_size: SITE_DOCS_CATALOG_PAGE_SIZE,
  }).then((result) => ({
    items: result.items,
    category_catalog: result.category_catalog,
  }));
}

export function fetchSiteDoc(docId: string): Promise<MarketingDoc> {
  return api.get<MarketingDoc>(`/site/docs/${docId}`);
}

export function createSiteDoc(
  body: CreateMarketingDocBody,
): Promise<MarketingDoc> {
  return api.post<MarketingDoc>("/site/docs", body);
}

export function duplicateSiteDoc(
  docId: string,
  body: DuplicateMarketingDocBody,
): Promise<MarketingDoc> {
  return api.post<MarketingDoc>(`/site/docs/${docId}/duplicate`, body);
}

export function updateSiteDoc(
  docId: string,
  body: UpdateMarketingDocBody,
): Promise<MarketingDoc> {
  return api.patch<MarketingDoc>(`/site/docs/${docId}`, body);
}

export function deleteSiteDoc(docId: string): Promise<{ ok: boolean }> {
  return api.delete<{ ok: boolean }>(`/site/docs/${docId}`);
}

export function publishSiteDoc(docId: string): Promise<MarketingDoc> {
  return api.post<MarketingDoc>(`/site/docs/${docId}/publish`, {});
}

export function unpublishSiteDoc(docId: string): Promise<MarketingDoc> {
  return api.post<MarketingDoc>(`/site/docs/${docId}/unpublish`, {});
}

export function revertSiteDoc(docId: string): Promise<MarketingDoc> {
  return api.post<MarketingDoc>(`/site/docs/${docId}/revert`, {});
}

/** 导入 `.md` 文件（支持多选）。 */
export function importSiteDocs(files: File[]): Promise<{
  imported: Array<{ slug: string; title: string; created: boolean }>;
}> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  return api.upload<{
    imported: Array<{ slug: string; title: string; created: boolean }>;
  }>("/site/docs/import", formData);
}

/** 导出单篇文档的 Markdown 文本（含 frontmatter）。 */
export async function exportSiteDoc(
  docId: string,
): Promise<{ filename: string; markdown: string; title: string }> {
  return api.get<{ filename: string; markdown: string; title: string }>(
    `/site/docs/${docId}/export`,
  );
}

/** 导出全部文档（JSON），由前端逐篇触发下载。 */
export function fetchAllDocsForExport(): Promise<{
  docs: Array<{ filename: string; markdown: string; title: string }>;
}> {
  return api.get<{
    docs: Array<{ filename: string; markdown: string; title: string }>;
  }>("/site/docs-export-all");
}

export const SITE_DOC_CATEGORIES_QUERY_KEY = [
  ...SITE_DOCS_QUERY_KEY,
  "categories",
] as const;

export function fetchSiteDocCategories(): Promise<MarketingDocCategory[]> {
  return api.get<MarketingDocCategory[]>("/site/doc-categories");
}

export function createSiteDocCategory(
  body: CreateMarketingDocCategoryBody,
): Promise<MarketingDocCategory> {
  return api.post<MarketingDocCategory>("/site/doc-categories", body);
}

export function updateSiteDocCategory(
  categoryId: string,
  body: UpdateMarketingDocCategoryBody,
): Promise<MarketingDocCategory> {
  return api.patch<MarketingDocCategory>(
    `/site/doc-categories/${categoryId}`,
    body,
  );
}

export function deleteSiteDocCategory(
  categoryId: string,
): Promise<{ ok: boolean }> {
  return api.delete<{ ok: boolean }>(`/site/doc-categories/${categoryId}`);
}

export function reorderSiteDocCategories(
  body: ReorderMarketingDocCategoriesBody,
): Promise<MarketingDocCategory[]> {
  return api.put<MarketingDocCategory[]>("/site/doc-categories/order", body);
}

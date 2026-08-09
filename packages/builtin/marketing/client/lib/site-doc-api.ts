import { api } from "@be-water/client-kit";

import type {
  CreateMarketingDocBody,
  DuplicateMarketingDocBody,
  MarketingDoc,
  MarketingDocListItem,
  UpdateMarketingDocBody,
} from "../../shared/marketing-doc.js";

export const SITE_DOCS_QUERY_KEY = ["site", "docs"] as const;

export function fetchSiteDocs(): Promise<MarketingDocListItem[]> {
  return api.get<MarketingDocListItem[]>("/site/docs");
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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  SITE_DOCS_QUERY_KEY,
  createSiteDoc,
  deleteSiteDoc,
  duplicateSiteDoc,
  exportSiteDoc,
  fetchAllDocsForExport,
  fetchSiteDoc,
  fetchSiteDocs,
  fetchSiteDocsCatalog,
  importSiteDocs,
  publishSiteDoc,
  revertSiteDoc,
  unpublishSiteDoc,
  updateSiteDoc,
} from "../lib/site-doc-api.js";

import type {
  CreateMarketingDocBody,
  DuplicateMarketingDocBody,
  MarketingDocListQuery,
  UpdateMarketingDocBody,
} from "../../shared/marketing-doc.js";

const DOC_FILTER_KEY_NAMES = ["q", "category", "status", "locale"] as const;

function docFiltersEqual(
  left: MarketingDocListQuery | undefined,
  right: MarketingDocListQuery,
): boolean {
  if (!left) return false;
  return DOC_FILTER_KEY_NAMES.every((key) => left[key] === right[key]);
}

/** 文档库列表页：服务端筛选 / 排序 / 分页。 */
export function useSiteDocs(query: MarketingDocListQuery) {
  return useQuery({
    queryKey: [...SITE_DOCS_QUERY_KEY, "list", query],
    queryFn: () => fetchSiteDocs(query),
    // 只在翻页时沿用上一页；换筛选时清空，避免表格仍显示旧结果像「重置无效」。
    // queryKey = ["site","docs","list", query] → 筛选项在 index 3。
    placeholderData: (previousData, previousQuery) => {
      const previous = previousQuery?.queryKey[3] as
        | MarketingDocListQuery
        | undefined;
      return docFiltersEqual(previous, query) ? previousData : undefined;
    },
  });
}

/** 编辑器 / 复制 / 页头预览：拉近似全量目录。 */
export function useSiteDocsCatalog(enabled = true) {
  return useQuery({
    queryKey: [...SITE_DOCS_QUERY_KEY, "catalog"],
    queryFn: fetchSiteDocsCatalog,
    enabled,
  });
}

export function useSiteDoc(docId: string | null) {
  return useQuery({
    queryKey: [...SITE_DOCS_QUERY_KEY, docId],
    queryFn: () => fetchSiteDoc(docId!),
    enabled: Boolean(docId),
  });
}

export function useCreateSiteDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMarketingDocBody) => createSiteDoc(body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SITE_DOCS_QUERY_KEY }),
  });
}

export function useDuplicateSiteDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      docId,
      body,
    }: {
      docId: string;
      body: DuplicateMarketingDocBody;
    }) => duplicateSiteDoc(docId, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SITE_DOCS_QUERY_KEY }),
  });
}

export function useUpdateSiteDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      docId,
      body,
    }: {
      docId: string;
      body: UpdateMarketingDocBody;
    }) => updateSiteDoc(docId, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SITE_DOCS_QUERY_KEY });
      queryClient.setQueryData([...SITE_DOCS_QUERY_KEY, data.id], data);
    },
  });
}

export function useDeleteSiteDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => deleteSiteDoc(docId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SITE_DOCS_QUERY_KEY }),
  });
}

export function usePublishSiteDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => publishSiteDoc(docId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SITE_DOCS_QUERY_KEY }),
  });
}

export function useUnpublishSiteDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => unpublishSiteDoc(docId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SITE_DOCS_QUERY_KEY }),
  });
}

export function useRevertSiteDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => revertSiteDoc(docId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SITE_DOCS_QUERY_KEY }),
  });
}

export function useImportSiteDocs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => importSiteDocs(files),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SITE_DOCS_QUERY_KEY }),
  });
}

export function useExportSiteDoc() {
  return useMutation({
    mutationFn: (docId: string) => exportSiteDoc(docId),
  });
}

export function useExportAllSiteDocs() {
  return useMutation({
    mutationFn: fetchAllDocsForExport,
  });
}

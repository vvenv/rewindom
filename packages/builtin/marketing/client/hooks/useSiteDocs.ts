import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  SITE_DOCS_QUERY_KEY,
  createSiteDoc,
  deleteSiteDoc,
  exportSiteDoc,
  fetchAllDocsForExport,
  fetchSiteDoc,
  fetchSiteDocs,
  importSiteDocs,
  publishSiteDoc,
  revertSiteDoc,
  unpublishSiteDoc,
  updateSiteDoc,
} from "../lib/site-doc-api.js";

import type {
  CreateMarketingDocBody,
  UpdateMarketingDocBody,
} from "../../shared/marketing-doc.js";

export function useSiteDocs() {
  return useQuery({
    queryKey: SITE_DOCS_QUERY_KEY,
    queryFn: fetchSiteDocs,
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

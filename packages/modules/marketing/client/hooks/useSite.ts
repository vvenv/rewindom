import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  applySiteStarter,
  createSitePage,
  deleteSitePage,
  duplicateSitePage,
  fetchSite,
  fetchSitePage,
  fetchSitePages,
  patchSite,
  publishSiteEditorDraft,
  revertSiteEditorDraft,
  saveSiteEditorDraft,
  SITE_PAGES_QUERY_KEY,
  SITE_QUERY_KEY,
  unpublishSitePage,
} from "../lib/site-api.js";

import type {
  CreateMarketingPageBody,
  DuplicateMarketingPageBody,
  SaveEditorDraftBody,
  UpdateMarketingSiteBody,
} from "../../shared/site-cms.js";

export function useSite() {
  return useQuery({
    queryKey: SITE_QUERY_KEY,
    queryFn: fetchSite,
  });
}

export function useSitePages() {
  return useQuery({
    queryKey: SITE_PAGES_QUERY_KEY,
    queryFn: fetchSitePages,
  });
}

export function useSitePage(pageId: string | undefined) {
  return useQuery({
    queryKey: [...SITE_PAGES_QUERY_KEY, pageId],
    queryFn: () => fetchSitePage(pageId!),
    enabled: Boolean(pageId),
  });
}

export function useSiteMutations() {
  const queryClient = useQueryClient();

  const invalidate = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: SITE_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: SITE_PAGES_QUERY_KEY }),
    ]);
  };

  const updateSite = useMutation({
    mutationFn: (body: UpdateMarketingSiteBody) => patchSite(body),
    onSuccess: () => invalidate(),
  });

  const createPage = useMutation({
    mutationFn: (body: CreateMarketingPageBody) => createSitePage(body),
    onSuccess: () => invalidate(),
  });

  const duplicatePage = useMutation({
    mutationFn: ({
      pageId,
      body,
    }: {
      pageId: string;
      body: DuplicateMarketingPageBody;
    }) => duplicateSitePage(pageId, body),
    onSuccess: () => invalidate(),
  });

  const saveEditorDraft = useMutation({
    mutationFn: ({
      pageId,
      body,
    }: {
      pageId: string;
      body: SaveEditorDraftBody;
    }) => saveSiteEditorDraft(pageId, body),
    onSuccess: () => invalidate(),
  });

  const applyStarter = useMutation({
    mutationFn: (key: string) => applySiteStarter(key),
    onSuccess: () => invalidate(),
  });

  /** 一次发布：正文 + 页头页脚。 */
  const publishDraft = useMutation({
    mutationFn: (pageId: string) => publishSiteEditorDraft(pageId),
    onSuccess: () => invalidate(),
  });

  /** 一次撤销：正文 + 页头页脚回到线上那一版。 */
  const revertDraft = useMutation({
    mutationFn: (pageId: string) => revertSiteEditorDraft(pageId),
    onSuccess: () => invalidate(),
  });

  const removePage = useMutation({
    mutationFn: (pageId: string) => deleteSitePage(pageId),
    onSuccess: () => invalidate(),
  });

  const unpublishPage = useMutation({
    mutationFn: (pageId: string) => unpublishSitePage(pageId),
    onSuccess: () => invalidate(),
  });

  return {
    updateSite,
    createPage,
    duplicatePage,
    saveEditorDraft,
    applyStarter,
    publishDraft,
    revertDraft,
    removePage,
    unpublishPage,
  };
}

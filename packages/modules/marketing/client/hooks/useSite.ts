import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createSitePage,
  deleteSitePage,
  fetchSite,
  fetchSitePage,
  fetchSitePages,
  patchSite,
  patchSitePage,
  publishSitePage,
  SITE_PAGES_QUERY_KEY,
  SITE_QUERY_KEY,
  unpublishSitePage,
} from "../lib/site-api.js";

import type {
  CreateMarketingPageBody,
  UpdateMarketingPageBody,
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

  const updatePage = useMutation({
    mutationFn: ({
      pageId,
      body,
    }: {
      pageId: string;
      body: UpdateMarketingPageBody;
    }) => patchSitePage(pageId, body),
    onSuccess: () => invalidate(),
  });

  const removePage = useMutation({
    mutationFn: (pageId: string) => deleteSitePage(pageId),
    onSuccess: () => invalidate(),
  });

  const publishPage = useMutation({
    mutationFn: (pageId: string) => publishSitePage(pageId),
    onSuccess: () => invalidate(),
  });

  const unpublishPage = useMutation({
    mutationFn: (pageId: string) => unpublishSitePage(pageId),
    onSuccess: () => invalidate(),
  });

  return {
    updateSite,
    createPage,
    updatePage,
    removePage,
    publishPage,
    unpublishPage,
  };
}

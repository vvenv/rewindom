import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createSitePage,
  deleteSitePage,
  duplicateSitePage,
  fetchSite,
  fetchSiteCapabilities,
  fetchSitePage,
  fetchSitePages,
  patchSite,
  publishSiteDraft,
  publishSiteEditorDraft,
  reorderSitePages,
  resetSitePagePreset,
  initializeSiteTemplatePage,
  applySiteHomeLayout,
  revertSiteDraft,
  revertSiteEditorDraft,
  saveSiteDraft,
  saveSiteEditorDraft,
  SITE_CAPABILITIES_QUERY_KEY,
  SITE_PAGES_QUERY_KEY,
  SITE_QUERY_KEY,
  unpublishSitePage,
} from "../lib/site-api.js";

import type {
  CreateMarketingPageBody,
  DuplicateMarketingPageBody,
  ReorderMarketingPagesBody,
  SaveSiteDraftBody,
  SaveEditorDraftBody,
  UpdateMarketingSiteBody,
} from "../../shared/site-cms.js";

export function useSite() {
  return useQuery({
    queryKey: SITE_QUERY_KEY,
    queryFn: fetchSite,
  });
}

/**
 * 本站具备哪些需要另外开通的能力。
 *
 * 与站点内容分开缓存（见 `SITE_CAPABILITIES_QUERY_KEY`）：它跟着**租户开通状态**
 * 变，不随编辑保存而变。
 */
export function useSiteCapabilities() {
  return useQuery({
    queryKey: SITE_CAPABILITIES_QUERY_KEY,
    queryFn: fetchSiteCapabilities,
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

  const saveSiteDraftMutation = useMutation({
    mutationFn: (body: SaveSiteDraftBody) => saveSiteDraft(body),
    onSuccess: () => invalidate(),
  });

  const publishSiteDraftMutation = useMutation({
    mutationFn: () => publishSiteDraft(),
    onSuccess: () => invalidate(),
  });

  const revertSiteDraftMutation = useMutation({
    mutationFn: () => revertSiteDraft(),
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

  /**
   * 整批重排页面顺序。
   *
   * 成功后直接把返回的清单写进缓存再作废：列表当场就是新顺序，不会先弹回旧顺序、
   * 等重新拉取到了再跳一次——排序这种「肉眼盯着看」的操作最忌讳这一下回跳。
   */
  const reorderPages = useMutation({
    mutationFn: (body: ReorderMarketingPagesBody) => reorderSitePages(body),
    onSuccess: (pages) => {
      queryClient.setQueryData(SITE_PAGES_QUERY_KEY, pages);
      return invalidate();
    },
  });

  const removePage = useMutation({
    mutationFn: (pageId: string) => deleteSitePage(pageId),
    onSuccess: () => invalidate(),
  });

  const unpublishPage = useMutation({
    mutationFn: (pageId: string) => unpublishSitePage(pageId),
    onSuccess: () => invalidate(),
  });

  /** 重设为最新版式（只写草稿）。返回的整页先写进缓存，编辑器灌入不用空一拍。 */
  const resetPagePreset = useMutation({
    mutationFn: (pageId: string) => resetSitePagePreset(pageId),
    onSuccess: (page) => {
      queryClient.setQueryData([...SITE_PAGES_QUERY_KEY, page.id], page);
      return invalidate();
    },
  });

  /**
   * 初始化一张模板页的版式（首页 / 会员那几张平时不预建的）。
   *
   * 与 reorder 同一手法：返回的清单先写进缓存再作废，点完按钮那一行当场就在，
   * 不会先空一拍等重新拉取。
   */
  const initializeTemplatePage = useMutation({
    mutationFn: (kind: string) => initializeSiteTemplatePage(kind),
    onSuccess: (pages) => {
      queryClient.setQueryData(SITE_PAGES_QUERY_KEY, pages);
      return invalidate();
    },
  });

  /** 套用一套首页版式（只写草稿，并把 home_path 收回 /）。 */
  const applyHomeLayout = useMutation({
    mutationFn: (key: string) => applySiteHomeLayout(key),
    onSuccess: () => invalidate(),
  });

  return {
    updateSite,
    createPage,
    duplicatePage,
    saveEditorDraft,
    saveSiteDraft: saveSiteDraftMutation,
    publishSiteDraft: publishSiteDraftMutation,
    revertSiteDraft: revertSiteDraftMutation,
    publishDraft,
    revertDraft,
    reorderPages,
    removePage,
    unpublishPage,
    resetPagePreset,
    initializeTemplatePage,
    applyHomeLayout,
  };
}

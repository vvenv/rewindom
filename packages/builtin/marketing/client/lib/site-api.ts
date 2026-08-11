import { api } from "@be-water/client-kit";

import type {
  CreateMarketingPageBody,
  DuplicateMarketingPageBody,
  MarketingPage,
  MarketingPageListItem,
  MarketingSite,
  MarketingSiteCapabilities,
  PublicMarketingPage,
  PublicMarketingSite,
  ApplySiteStarterResponse,
  ReorderMarketingPagesBody,
  SaveSiteDraftBody,
  SaveSiteDraftResponse,
  SaveEditorDraftBody,
  SaveEditorDraftResponse,
  UpdateMarketingSiteBody,
} from "../../shared/site-cms.js";
import type { SiteLinkTarget } from "../../shared/site-link-target.js";
import type { AppLocale } from "@be-water/shared";

export const SITE_QUERY_KEY = ["site"] as const;
/*
 * 刻意**不**挂在 `["site", …]` 之下：`SITE_QUERY_KEY` 是前缀，每次保存草稿都会
 * `invalidateQueries(["site"])` 把它一并作废，而能力只随租户开通状态变。
 */
export const SITE_CAPABILITIES_QUERY_KEY = ["site-capabilities"] as const;
export const SITE_PAGES_QUERY_KEY = ["site", "pages"] as const;
/*
 * 同 capabilities 的理由不挂在 `["site", …]` 之下：候选表随页面 / 文档增删而变，
 * 不随每次保存草稿而变；跟着 `["site"]` 一起作废只会白拉一遍全部文档标题。
 */
export const SITE_LINK_TARGETS_QUERY_KEY = ["site-link-targets"] as const;
export const PUBLIC_SITE_QUERY_KEY = ["public", "site"] as const;

export function fetchSite(): Promise<MarketingSite> {
  return api.get<MarketingSite>("/site");
}

/** 本站具备哪些需要另外开通的能力（如页头账户入口）。 */
export function fetchSiteCapabilities(): Promise<MarketingSiteCapabilities> {
  return api.get<MarketingSiteCapabilities>("/site/capabilities");
}

/** 编辑器填链接时的站内候选（页面 + 文档索引 + 各篇文档）。 */
export function fetchSiteLinkTargets(): Promise<SiteLinkTarget[]> {
  return api.get<SiteLinkTarget[]>("/site/link-targets");
}

export function patchSite(
  body: UpdateMarketingSiteBody,
): Promise<MarketingSite> {
  return api.patch<MarketingSite>("/site", body);
}

export function fetchSitePages(): Promise<MarketingPageListItem[]> {
  return api.get<MarketingPageListItem[]>("/site/pages");
}

export function fetchSitePage(pageId: string): Promise<MarketingPage> {
  return api.get<MarketingPage>(`/site/pages/${pageId}`);
}

export function createSitePage(
  body: CreateMarketingPageBody,
): Promise<MarketingPage> {
  return api.post<MarketingPage>("/site/pages", body);
}

/** 整批写入页面顺序（`sort_order` 是相对关系，一个事务写完）。 */
export function reorderSitePages(
  body: ReorderMarketingPagesBody,
): Promise<MarketingPageListItem[]> {
  return api.put<MarketingPageListItem[]>("/site/pages/order", body);
}

export function duplicateSitePage(
  pageId: string,
  body: DuplicateMarketingPageBody,
): Promise<MarketingPage> {
  return api.post<MarketingPage>(`/site/pages/${pageId}/duplicate`, body);
}

/** Theme Editor 一次保存：页面内容与页头页脚同事务落库。 */
export function saveSiteEditorDraft(
  pageId: string,
  body: SaveEditorDraftBody,
): Promise<SaveEditorDraftResponse> {
  return api.put<SaveEditorDraftResponse>(`/site/pages/${pageId}/draft`, body);
}

/** 只保存**站点级**草稿（页头 / 页脚 / 主题），不带任何页面正文。 */
export function saveSiteDraft(
  body: SaveSiteDraftBody,
): Promise<SaveSiteDraftResponse> {
  return api.put<SaveSiteDraftResponse>("/site/draft", body);
}

/** 站点级草稿上线（页头 / 页脚 / 主题；不影响页面正文）。 */
export function publishSiteDraft(): Promise<SaveSiteDraftResponse> {
  return api.post<SaveSiteDraftResponse>("/site/draft/publish", {});
}

/** 站点级草稿还原为线上那一版（不影响页面正文）。 */
export function revertSiteDraft(): Promise<SaveSiteDraftResponse> {
  return api.post<SaveSiteDraftResponse>("/site/draft/revert", {});
}

export function applySiteStarter(
  key: string,
): Promise<ApplySiteStarterResponse> {
  return api.post<ApplySiteStarterResponse>(`/site/starters/${key}/apply`, {});
}

export function uploadSiteAsset(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  return api.upload<{ url: string }>("/site/assets", formData);
}

export function deleteSitePage(pageId: string): Promise<{ ok: boolean }> {
  return api.delete<{ ok: boolean }>(`/site/pages/${pageId}`);
}

/** 一次发布：本页正文 + 站点级页头页脚，服务端同一事务。 */
export function publishSiteEditorDraft(
  pageId: string,
): Promise<SaveEditorDraftResponse> {
  return api.post<SaveEditorDraftResponse>(`/site/pages/${pageId}/publish`, {});
}

/** 一次撤销：正文与页头页脚的草稿一起回到线上那一版。 */
export function revertSiteEditorDraft(
  pageId: string,
): Promise<SaveEditorDraftResponse> {
  return api.post<SaveEditorDraftResponse>(`/site/pages/${pageId}/revert`, {});
}

export function unpublishSitePage(pageId: string): Promise<MarketingPage> {
  return api.post<MarketingPage>(`/site/pages/${pageId}/unpublish`, {});
}

/** 重设为最新版式：结构对齐最新预设、内容尽量保留，只写草稿（发布才对访客生效）。 */
export function resetSitePagePreset(pageId: string): Promise<MarketingPage> {
  return api.post<MarketingPage>(`/site/pages/${pageId}/reset-preset`, {});
}

export function fetchPublicSite(
  locale?: AppLocale,
): Promise<PublicMarketingSite> {
  return api.get<PublicMarketingSite>(
    "/public/site",
    locale ? { locale } : undefined,
    true,
  );
}

export function fetchPublicSitePage(
  path: string,
  locale?: AppLocale,
): Promise<{
  site: PublicMarketingSite;
  page: PublicMarketingPage;
}> {
  return api.get<{ site: PublicMarketingSite; page: PublicMarketingPage }>(
    "/public/site/page",
    locale ? { path, locale } : { path },
    true,
  );
}

export function fetchSitePreview(
  path: string,
  locale?: AppLocale,
): Promise<{
  site: PublicMarketingSite;
  page: PublicMarketingPage;
}> {
  return api.get<{ site: PublicMarketingSite; page: PublicMarketingPage }>(
    "/site/preview",
    locale ? { path, locale } : { path },
  );
}

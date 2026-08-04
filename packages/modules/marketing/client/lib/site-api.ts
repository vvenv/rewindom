import { api } from "@be-water/client-kit";

import type {
  CreateMarketingPageBody,
  DuplicateMarketingPageBody,
  MarketingPage,
  MarketingPageListItem,
  MarketingSite,
  PublicMarketingPage,
  PublicMarketingSite,
  ApplySiteStarterResponse,
  SaveEditorDraftBody,
  SaveEditorDraftResponse,
  UpdateMarketingPageBody,
  UpdateMarketingSiteBody,
} from "../../shared/site-cms.js";
import type { AppLocale } from "@be-water/shared";

export const SITE_QUERY_KEY = ["site"] as const;
export const SITE_PAGES_QUERY_KEY = ["site", "pages"] as const;
export const PUBLIC_SITE_QUERY_KEY = ["public", "site"] as const;

export function fetchSite(): Promise<MarketingSite> {
  return api.get<MarketingSite>("/site");
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

export function duplicateSitePage(
  pageId: string,
  body: DuplicateMarketingPageBody,
): Promise<MarketingPage> {
  return api.post<MarketingPage>(`/site/pages/${pageId}/duplicate`, body);
}

export function patchSitePage(
  pageId: string,
  body: UpdateMarketingPageBody,
): Promise<MarketingPage> {
  return api.patch<MarketingPage>(`/site/pages/${pageId}`, body);
}

/** Theme Editor 一次保存：页面内容与页头页脚同事务落库。 */
export function saveSiteEditorDraft(
  pageId: string,
  body: SaveEditorDraftBody,
): Promise<SaveEditorDraftResponse> {
  return api.put<SaveEditorDraftResponse>(`/site/pages/${pageId}/draft`, body);
}

export function applySiteStarter(key: string): Promise<ApplySiteStarterResponse> {
  return api.post<ApplySiteStarterResponse>(`/site/starters/${key}/apply`, {});
}

export function publishSiteChrome(): Promise<MarketingSite> {
  return api.post<MarketingSite>("/site/chrome/publish", {});
}

export function uploadSiteAsset(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  return api.upload<{ url: string }>("/site/assets", formData);
}

export function deleteSitePage(pageId: string): Promise<{ ok: boolean }> {
  return api.delete<{ ok: boolean }>(`/site/pages/${pageId}`);
}

export function publishSitePage(pageId: string): Promise<MarketingPage> {
  return api.post<MarketingPage>(`/site/pages/${pageId}/publish`, {});
}

export function publishSitePageContent(pageId: string): Promise<MarketingPage> {
  return api.post<MarketingPage>(`/site/pages/${pageId}/content/publish`, {});
}

export function unpublishSitePage(pageId: string): Promise<MarketingPage> {
  return api.post<MarketingPage>(`/site/pages/${pageId}/unpublish`, {});
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

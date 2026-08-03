import { api } from "@be-water/client-kit";

import type {
  CreateMarketingPageBody,
  MarketingPage,
  MarketingPageListItem,
  MarketingSite,
  PublicMarketingPage,
  PublicMarketingSite,
  UpdateMarketingPageBody,
  UpdateMarketingSiteBody,
} from "../../shared/site-cms.js";

export const SITE_QUERY_KEY = ["site"] as const;
export const SITE_PAGES_QUERY_KEY = ["site", "pages"] as const;
export const PUBLIC_SITE_QUERY_KEY = ["public", "site"] as const;

export function fetchSite(): Promise<MarketingSite> {
  return api.get<MarketingSite>("/site");
}

export function patchSite(body: UpdateMarketingSiteBody): Promise<MarketingSite> {
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

export function patchSitePage(
  pageId: string,
  body: UpdateMarketingPageBody,
): Promise<MarketingPage> {
  return api.patch<MarketingPage>(`/site/pages/${pageId}`, body);
}

export function deleteSitePage(pageId: string): Promise<{ ok: boolean }> {
  return api.delete<{ ok: boolean }>(`/site/pages/${pageId}`);
}

export function publishSitePage(pageId: string): Promise<MarketingPage> {
  return api.post<MarketingPage>(`/site/pages/${pageId}/publish`, {});
}

export function unpublishSitePage(pageId: string): Promise<MarketingPage> {
  return api.post<MarketingPage>(`/site/pages/${pageId}/unpublish`, {});
}

export function fetchPublicSite(): Promise<PublicMarketingSite> {
  return api.get<PublicMarketingSite>("/public/site", undefined, true);
}

export function fetchPublicSitePage(path: string): Promise<{
  site: PublicMarketingSite;
  page: PublicMarketingPage;
}> {
  return api.get<{ site: PublicMarketingSite; page: PublicMarketingPage }>(
    "/public/site/page",
    { path },
    true,
  );
}

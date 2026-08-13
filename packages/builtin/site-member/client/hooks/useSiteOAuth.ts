import { api } from "@rewindom/client-kit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  SiteOAuthProviderId,
  SiteOAuthProvidersStatus,
  UpsertSiteOAuthProviderBody,
} from "../../shared/site-oauth.js";

export const SITE_OAUTH_QUERY_KEY = ["site-oauth-providers"] as const;

export function useSiteOAuthProviders() {
  return useQuery({
    queryKey: SITE_OAUTH_QUERY_KEY,
    queryFn: () =>
      api.get<SiteOAuthProvidersStatus>("/site-members/oauth-providers"),
  });
}

export function useUpsertSiteOAuthProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      provider,
      body,
    }: {
      provider: SiteOAuthProviderId;
      body: UpsertSiteOAuthProviderBody;
    }) =>
      api.put<SiteOAuthProvidersStatus>(
        `/site-members/oauth-providers/${provider}`,
        body,
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(SITE_OAUTH_QUERY_KEY, data);
    },
  });
}

export function useClearSiteOAuthProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: SiteOAuthProviderId) =>
      api.delete<SiteOAuthProvidersStatus>(
        `/site-members/oauth-providers/${provider}`,
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(SITE_OAUTH_QUERY_KEY, data);
    },
  });
}

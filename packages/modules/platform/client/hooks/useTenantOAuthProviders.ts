import { api } from "@be-water/client-kit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  TenantOAuthProviderId,
  TenantOAuthProvidersStatus,
  UpsertTenantOAuthProviderBody,
} from "../../shared/tenant-oauth.js";

export const TENANT_OAUTH_PROVIDERS_QUERY_KEY = [
  "settings",
  "oauth-providers",
] as const;

export function useTenantOAuthProviders() {
  return useQuery({
    queryKey: TENANT_OAUTH_PROVIDERS_QUERY_KEY,
    queryFn: () =>
      api.get<TenantOAuthProvidersStatus>("/settings/oauth-providers"),
  });
}

export function useUpsertTenantOAuthProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      provider: TenantOAuthProviderId;
      body: UpsertTenantOAuthProviderBody;
    }) =>
      api.put<TenantOAuthProvidersStatus>(
        `/settings/oauth-providers/${input.provider}`,
        input.body,
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(TENANT_OAUTH_PROVIDERS_QUERY_KEY, data);
    },
  });
}

export function useClearTenantOAuthProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: TenantOAuthProviderId) =>
      api.delete<TenantOAuthProvidersStatus>(
        `/settings/oauth-providers/${provider}`,
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(TENANT_OAUTH_PROVIDERS_QUERY_KEY, data);
    },
  });
}

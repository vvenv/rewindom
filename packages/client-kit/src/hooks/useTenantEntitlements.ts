import { useQuery } from "@tanstack/react-query";

import { api } from "../api.js";

import type { TenantEntitlementsResponse, TenantFeatureKey } from "@be-water/shared";

export const TENANT_ENTITLEMENTS_QUERY_KEY = ["tenant-entitlements"] as const;

export function useTenantEntitlements(enabled = true) {
  return useQuery({
    queryKey: TENANT_ENTITLEMENTS_QUERY_KEY,
    queryFn: () =>
      api.get<TenantEntitlementsResponse>("/settings/tenant-features"),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTenantModuleEnabled(moduleId: string) {
  const { data, isLoading } = useTenantEntitlements();
  return {
    enabled: data?.modules[moduleId] ?? true,
    isLoading,
  };
}

export function useTenantFeatureEnabled(feature: TenantFeatureKey) {
  const { data, isLoading } = useTenantEntitlements();
  return {
    enabled: Boolean(data?.features[feature]),
    isLoading,
  };
}

export function useTenantEntitlementState(
  moduleId?: string,
  feature?: TenantFeatureKey,
) {
  const { data, isLoading } = useTenantEntitlements();

  if (isLoading) {
    return { enabled: false, isLoading: true };
  }

  if (moduleId && data && data.modules[moduleId] === false) {
    return { enabled: false, isLoading: false };
  }

  if (feature && data && !data.features[feature]) {
    return { enabled: false, isLoading: false };
  }

  return { enabled: true, isLoading: false };
}

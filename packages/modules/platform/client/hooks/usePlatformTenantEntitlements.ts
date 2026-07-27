import { api } from "@be-water/client-kit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";


import type { UpdateTenantEntitlementsBody } from "../../shared/index.js";
import type { TenantEntitlementCatalog, TenantEntitlementsResponse } from "@be-water/shared";

interface PlatformTenantEntitlementsPayload {
  catalog: TenantEntitlementCatalog;
  entitlements: TenantEntitlementsResponse;
}

const platformTenantEntitlementsKey = (tenantId: string) =>
  ["platform", "tenants", tenantId, "entitlements"] as const;

export function usePlatformTenantEntitlements(tenantId: string | null) {
  return useQuery({
    queryKey: platformTenantEntitlementsKey(tenantId ?? ""),
    queryFn: async () => {
      const [catalog, entitlements] = await Promise.all([
        api.get<TenantEntitlementCatalog>("/platform/tenant-catalog"),
        api.get<TenantEntitlementsResponse>(
          `/platform/tenants/${tenantId}/entitlements`,
        ),
      ]);

      return { catalog, entitlements } satisfies PlatformTenantEntitlementsPayload;
    },
    enabled: Boolean(tenantId),
  });
}

/** @deprecated Use usePlatformTenantEntitlements */
export function usePlatformTenantFeatures(tenantId: string | null) {
  const query = usePlatformTenantEntitlements(tenantId);
  return {
    ...query,
    data: query.data
      ? { features: query.data.entitlements.features }
      : undefined,
  };
}

export function useUpdatePlatformTenantEntitlements(tenantId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateTenantEntitlementsBody) => {
      if (!tenantId) {
        throw new Error("tenantId 为必填项");
      }
      return api.put<TenantEntitlementsResponse>(
        `/platform/tenants/${tenantId}/entitlements`,
        body,
      );
    },
    onSuccess: (entitlements) => {
      if (!tenantId) return;
      queryClient.setQueryData(
        platformTenantEntitlementsKey(tenantId),
        (current: PlatformTenantEntitlementsPayload | undefined) =>
          current
            ? { ...current, entitlements }
            : {
                catalog: { modules: [], features: [] },
                entitlements,
              },
      );
      void queryClient.invalidateQueries({
        queryKey: ["platform", "tenants", tenantId, "integration-status"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["tenant-entitlements"],
      });
    },
  });
}

/** @deprecated Use useUpdatePlatformTenantEntitlements */
export function useUpdatePlatformTenantFeatures(tenantId: string | null) {
  const mutation = useUpdatePlatformTenantEntitlements(tenantId);
  return {
    ...mutation,
    mutateAsync: async (body: { features: UpdateTenantEntitlementsBody["features"] }) =>
      mutation.mutateAsync({ features: body.features }),
  };
}

import { api, TENANT_APPEARANCE_QUERY_KEY } from "@be-water/client-kit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  TenantAppearanceDetail,
  UpdateTenantAppearanceBody,
} from "../../shared/index.js";

const platformTenantAppearanceKey = (tenantId: string) =>
  ["platform", "tenants", tenantId, "appearance"] as const;

export function usePlatformTenantAppearance(tenantId: string | null) {
  return useQuery({
    queryKey: platformTenantAppearanceKey(tenantId ?? ""),
    queryFn: () =>
      api.get<TenantAppearanceDetail>(
        `/platform/tenants/${tenantId}/appearance`,
      ),
    enabled: Boolean(tenantId),
  });
}

export function useUpdatePlatformTenantAppearance(tenantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: UpdateTenantAppearanceBody) => {
      if (!tenantId) {
        throw new Error("tenantId 为必填项");
      }
      return api.put<TenantAppearanceDetail>(
        `/platform/tenants/${tenantId}/appearance`,
        body,
      );
    },
    onSuccess: (appearance) => {
      if (!tenantId) return;
      queryClient.setQueryData(
        platformTenantAppearanceKey(tenantId),
        appearance,
      );
      // 平台管理员可能正处于该租户的模拟登录态，顺手让租户侧的解析结果失效
      void queryClient.invalidateQueries({
        queryKey: TENANT_APPEARANCE_QUERY_KEY,
      });
    },
  });
}

import { useQuery } from "@tanstack/react-query";

import { api } from "../api.js";

import type { TenantBrandingUrls } from "@be-water/shared";

export const TENANT_BRANDING_QUERY_KEY = ["tenant-branding"] as const;

/**
 * 租户品牌公开 URL（logo / favicon）。
 * 硬编码 `/settings/branding`，与 appearance 同理——壳层不能依赖 platform 模块 hook。
 */
export function useTenantBranding(enabled = true) {
  return useQuery({
    queryKey: TENANT_BRANDING_QUERY_KEY,
    queryFn: () => api.get<TenantBrandingUrls>("/settings/branding"),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

import { useQuery } from "@tanstack/react-query";

import { api } from "../api.js";

import { useTenantApiEnabled } from "./use-tenant-api-enabled.js";

import type { ResolvedTenantAppearance } from "@be-water/shared";

export const TENANT_APPEARANCE_QUERY_KEY = ["tenant-appearance"] as const;

/**
 * 租户侧生效的外观默认值：主题与布局，各自「租户配置 > 平台默认」。
 *
 * 与 `useTenantEntitlements` 一样硬编码 `/settings/appearance`——client-kit 是
 * 底座设施，不能依赖 platform 模块的类型或 hook。
 * 主题与布局两个 Provider 共用本 hook，react-query 按 key 去重，只发一次请求。
 * 平台管理员会话不会发请求（见 `useTenantApiEnabled`）。
 */
export function useTenantAppearance(enabled = true) {
  const canFetch = useTenantApiEnabled(enabled);
  return useQuery({
    queryKey: TENANT_APPEARANCE_QUERY_KEY,
    queryFn: () => api.get<ResolvedTenantAppearance>("/settings/appearance"),
    enabled: canFetch,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnMount: canFetch,
  });
}

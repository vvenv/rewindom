import { api } from "@rewindom/client-kit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";


import type {
  CreateTenantBody,
  ImpersonateTenantResult,
  PatchTenantBody,
  ResetTenantAdminPasswordBody,
  TenantAdminCredentials,
  TenantCreated,
  TenantIntegrationStatus,
  TenantStats,
  TenantSummary,
  UpdateTenantPlanBody,
} from "../../shared/index.js";

const PLATFORM_TENANTS_KEY = ["platform", "tenants"] as const;

export function usePlatformTenants(includeArchived = false) {
  return useQuery({
    queryKey: [...PLATFORM_TENANTS_KEY, { include_archived: includeArchived }],
    queryFn: () =>
      api.get<TenantSummary[]>("/platform/tenants", {
        include_archived: includeArchived ? "true" : undefined,
      }),
  });
}

export function usePlatformTenantStats(tenantId: string | null) {
  return useQuery({
    queryKey: [...PLATFORM_TENANTS_KEY, tenantId, "stats"],
    queryFn: () => api.get<TenantStats>(`/platform/tenants/${tenantId}/stats`),
    enabled: Boolean(tenantId),
  });
}

export function useCreatePlatformTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTenantBody) =>
      api.post<TenantCreated>("/platform/tenants", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PLATFORM_TENANTS_KEY });
    },
  });
}

export function useResetTenantAdminPassword() {
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body?: ResetTenantAdminPasswordBody;
    }) =>
      api.post<TenantAdminCredentials>(
        `/platform/tenants/${id}/admin/reset-password`,
        body ?? {},
      ),
  });
}

export function usePatchPlatformTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PatchTenantBody }) =>
      api.patch<TenantSummary>(`/platform/tenants/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PLATFORM_TENANTS_KEY });
    },
  });
}

export function useUpdatePlatformTenantPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateTenantPlanBody }) =>
      api.put<TenantSummary>(`/platform/tenants/${id}/plan`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PLATFORM_TENANTS_KEY });
    },
  });
}

export function usePlatformTenantIntegrationStatus(tenantId: string | null) {
  return useQuery({
    queryKey: [...PLATFORM_TENANTS_KEY, tenantId, "integration-status"],
    queryFn: () =>
      api.get<TenantIntegrationStatus>(
        `/platform/tenants/${tenantId}/integration-status`,
      ),
    enabled: Boolean(tenantId),
  });
}

export function useArchivePlatformTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<TenantSummary>(`/platform/tenants/${id}/archive`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PLATFORM_TENANTS_KEY });
    },
  });
}

export function usePlatformTenantUsers(tenantId: string | null) {
  return useQuery({
    queryKey: [...PLATFORM_TENANTS_KEY, tenantId, "users"],
    queryFn: () =>
      api.get<Array<{ id: string; username: string; is_system_admin: boolean }>>(
        `/platform/tenants/${tenantId}/users`,
      ),
    enabled: Boolean(tenantId),
  });
}

export function useImpersonatePlatformTenant() {
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId?: string }) =>
      api.post<ImpersonateTenantResult>(
        `/platform/tenants/${id}/impersonate`,
        userId ? { user_id: userId } : {},
      ),
  });
}

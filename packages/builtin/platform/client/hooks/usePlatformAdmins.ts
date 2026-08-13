import { api } from "@rewindom/client-kit";
import { type RoleSummary, type PermissionCatalogEntry  } from "@rewindom/shared";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreatePlatformAdminBody,
  PlatformAdminListItem,
  PlatformRoleInput,
  PlatformRoleSummary,
  ResetPlatformAdminPasswordBody,
  UpdatePlatformAdminBody,
} from "../../shared/index.js";

const PLATFORM_ADMINS_KEY = ["platform", "admins"] as const;
const PLATFORM_ROLES_KEY = ["platform", "roles"] as const;

export function usePlatformAdmins(
  page: number,
  pageSize: number,
  search?: string,
  sortBy?: string,
  sortDir?: "asc" | "desc",
) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [...PLATFORM_ADMINS_KEY, page, pageSize, search, sortBy, sortDir],
    queryFn: () => {
      const params: Record<string, string | number> = {
        page,
        page_size: pageSize,
      };
      if (search) params.search = search;
      if (sortBy?.trim()) params.sort_by = sortBy;
      if (sortDir) params.sort_dir = sortDir;
      return api.get<{
        items: PlatformAdminListItem[];
        page: number;
        page_size: number;
        total: number;
        page_count: number;
      }>("/platform/admins", params);
    },
  });
}

export function usePlatformRoles() {
  return useQuery({
    queryKey: PLATFORM_ROLES_KEY,
    queryFn: () => api.get<PlatformRoleSummary[]>("/platform/roles"),
  });
}

export function usePlatformPermissionCatalog() {
  return useQuery({
    queryKey: ["platform", "permissions", "catalog"],
    queryFn: () =>
      api.get<{
        permissions: PermissionCatalogEntry[];
        groups: Record<string, readonly string[]>;
      }>("/platform/permissions/catalog"),
  });
}

export function usePlatformAdminRoles(adminId: string, enabled = true) {
  return useQuery({
    queryKey: [...PLATFORM_ADMINS_KEY, adminId, "roles"],
    queryFn: () =>
      api.get<{
        admin: {
          id: string;
          username: string;
          is_system_admin: boolean;
        };
        roles: RoleSummary[];
      }>(`/platform/admins/${adminId}/roles`),
    enabled,
  });
}

export function useCreatePlatformAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePlatformAdminBody) =>
      api.post<PlatformAdminListItem>("/platform/admins", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PLATFORM_ADMINS_KEY });
    },
  });
}

export function useUpdatePlatformAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: UpdatePlatformAdminBody & { id: string }) =>
      api.patch<PlatformAdminListItem>(`/platform/admins/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PLATFORM_ADMINS_KEY });
    },
  });
}

export function useDeletePlatformAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/platform/admins/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PLATFORM_ADMINS_KEY });
    },
  });
}

export function useResetPlatformAdminPassword() {
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: ResetPlatformAdminPasswordBody & { id: string }) =>
      api.post<{ password: string }>(
        `/platform/admins/${id}/reset-password`,
        body,
      ),
  });
}

export function useUpdatePlatformAdminRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role_ids }: { id: string; role_ids: string[] }) =>
      api.put(`/platform/admins/${id}/roles`, { role_ids }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: PLATFORM_ADMINS_KEY });
      void qc.invalidateQueries({
        queryKey: [...PLATFORM_ADMINS_KEY, variables.id, "roles"],
      });
    },
  });
}

export function useCreatePlatformRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PlatformRoleInput) =>
      api.post<PlatformRoleSummary>("/platform/roles", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PLATFORM_ROLES_KEY });
    },
  });
}

export function useUpdatePlatformRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: PlatformRoleInput & { id: string }) =>
      api.put<PlatformRoleSummary>(`/platform/roles/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PLATFORM_ROLES_KEY });
      void qc.invalidateQueries({ queryKey: PLATFORM_ADMINS_KEY });
    },
  });
}

export function useDeletePlatformRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/platform/roles/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PLATFORM_ROLES_KEY });
      void qc.invalidateQueries({ queryKey: PLATFORM_ADMINS_KEY });
    },
  });
}

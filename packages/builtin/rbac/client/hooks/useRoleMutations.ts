import { api } from "@rewindom/client-kit";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PERMISSIONS_QUERY_KEY } from "../shell/rbac-permission-provider.js";

import { ROLES_KEY } from "./useRoles.js";

import type { RolePayload } from "../lib/role-form.js";
import type { RoleDetail } from "@rewindom/shared";

/**
 * 角色变更会改动当前用户的有效权限（改的可能正是自己所属的角色），
 * 因此除角色列表外一并失效权限查询，避免侧栏与按钮的可见性滞后一次刷新。
 */
function useInvalidateRoles() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
      queryClient.invalidateQueries({ queryKey: PERMISSIONS_QUERY_KEY }),
    ]);
  };
}

export function useCreateRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: (payload: RolePayload) =>
      api.post<RoleDetail>("/roles", payload),
    onSuccess: invalidate,
  });
}

export function useUpdateRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: ({ id, ...payload }: RolePayload & { id: string }) =>
      api.put<RoleDetail>(`/roles/${id}`, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ success: boolean }>(`/roles/${id}`),
    onSuccess: invalidate,
  });
}

import { api } from "@rewindom/client-kit";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { RoleSummary, TenantUserListItem } from "@rewindom/shared";

const USERS_KEY = ["users"] as const;

export function useUsers(
  page?: number,
  pageSize?: number,
  search?: string,
  sortBy?: string,
  sortDir?: "asc" | "desc",
) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [...USERS_KEY, page, pageSize, search, sortBy, sortDir],
    queryFn: () => {
      const params: Record<string, number | string> = {};
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
      if (search !== undefined) params.search = search;
      if (sortBy !== undefined) params.sort_by = sortBy;
      if (sortDir !== undefined) params.sort_dir = sortDir;
      return api.get<{
        items: TenantUserListItem[];
        page: number;
        page_size: number;
        total: number;
        page_count: number;
      }>("/users", params);
    },
  });
}

export function useUserRoles(userId: string, enabled = true) {
  return useQuery({
    queryKey: ["users", userId, "roles"],
    queryFn: () =>
      api.get<{
        user: { id: string; username: string; is_system_admin: boolean };
        roles: RoleSummary[];
      }>(`/users/${userId}/roles`),
    enabled,
  });
}

export function useUpdateUserRoles() {
  return {
    mutateAsync: async ({
      userId,
      role_ids,
    }: {
      userId: string;
      role_ids: string[];
    }) =>
      api.put<{ roles: RoleSummary[] }>(`/users/${userId}/roles`, {
        role_ids,
      }),
  };
}

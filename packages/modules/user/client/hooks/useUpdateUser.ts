import { api } from "@be-water/client-kit";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { TenantUserListItem } from "@be-water/shared";

const USERS_KEY = ["users"] as const;

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      is_system_admin?: boolean;
      enabled?: boolean;
      role_ids?: string[];
    }) => api.patch<TenantUserListItem>(`/users/${id}`, data),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: USERS_KEY });
      return { id };
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}

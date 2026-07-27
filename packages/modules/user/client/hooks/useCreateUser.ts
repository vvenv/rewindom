import { api } from "@be-water/client-kit";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { TenantUserListItem } from "@be-water/shared";

const USERS_KEY = ["users"] as const;

export interface UserInput {
  username: string;
  password?: string;
  is_system_admin?: boolean;
  role_ids?: string[];
  enabled: boolean;
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UserInput) => api.post<TenantUserListItem>("/users", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}

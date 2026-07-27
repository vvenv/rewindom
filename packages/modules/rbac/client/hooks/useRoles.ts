import { api } from "@be-water/client-kit";
import { useQuery } from "@tanstack/react-query";

import type { RoleDetail } from "@be-water/shared";

export const ROLES_KEY = ["roles"] as const;

export function useRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => api.get<RoleDetail[]>("/roles"),
  });
}

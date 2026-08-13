import { api } from "@rewindom/client-kit";
import { useQuery } from "@tanstack/react-query";

import type { RoleDetail } from "@rewindom/shared";

export const ROLES_KEY = ["roles"] as const;

export function useRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => api.get<RoleDetail[]>("/roles"),
  });
}

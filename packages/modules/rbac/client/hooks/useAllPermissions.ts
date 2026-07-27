import { api } from "@be-water/client-kit";
import { useQuery } from "@tanstack/react-query";


import type { Permission } from "@be-water/shared";

export function useAllPermissions() {
  return useQuery({
    queryKey: ["all-permissions"],
    queryFn: () => api.get<Permission[]>("/permissions"),
  });
}

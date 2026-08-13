import { api } from "@rewindom/client-kit";
import { useQuery } from "@tanstack/react-query";

import type { PermissionCatalogEntry } from "@rewindom/shared";

export interface PermissionCatalogResponse {
  permissions: PermissionCatalogEntry[];
  groups: Record<string, readonly string[]>;
}

const PERMISSION_CATALOG_KEY = ["permissions", "catalog"] as const;

export function usePermissionCatalog() {
  return useQuery({
    queryKey: PERMISSION_CATALOG_KEY,
    queryFn: () =>
      api.get<PermissionCatalogResponse>("/permissions/catalog"),
  });
}

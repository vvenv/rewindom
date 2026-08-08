import { api } from "@be-water/client-kit";
import { keepPreviousData, useQuery } from "@tanstack/react-query";


import type { PlatformUserSummary } from "../../shared/index.js";

const PLATFORM_USERS_KEY = ["platform", "users"] as const;

export function usePlatformUsers(
  page?: number,
  pageSize?: number,
  search?: string,
  tenantSlug?: string,
  sortBy?: string,
  sortDir?: "asc" | "desc",
) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [
      ...PLATFORM_USERS_KEY,
      page,
      pageSize,
      search,
      tenantSlug,
      sortBy,
      sortDir,
    ],
    queryFn: () => {
      const params: Record<string, string | number> = {};
      if (search?.trim()) params.search = search;
      if (tenantSlug?.trim()) params.tenant_slug = tenantSlug;
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
      if (sortBy?.trim()) params.sort_by = sortBy;
      if (sortDir) params.sort_dir = sortDir;
      return api.get<{
        items: PlatformUserSummary[];
        page: number;
        page_size: number;
        total: number;
        page_count: number;
      }>("/platform/users", params);
    },
  });
}

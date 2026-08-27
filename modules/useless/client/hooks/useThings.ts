import { api } from "@rewindom/module-sdk/client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { ThingListItem } from "../../shared/index.js";

const THINGS_KEY = ["things"] as const;

export function useThings(
  page?: number,
  pageSize?: number,
  q?: string,
  sortBy?: string,
  sortDir?: "asc" | "desc",
) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [...THINGS_KEY, page, pageSize, q, sortBy, sortDir],
    queryFn: () => {
      const params: Record<string, number | string> = {};
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
      if (q) params.q = q;
      if (sortBy?.trim()) params.sort_by = sortBy;
      if (sortDir) params.sort_dir = sortDir;
      return api.get<{
        items: ThingListItem[];
        page: number;
        page_size: number;
        total: number;
        page_count: number;
      }>("/things", params);
    },
  });
}

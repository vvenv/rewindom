import { api } from "@rewindom/module-sdk/client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { ContentListItem } from "../../shared/index.js";

export const CONTENTS_KEY = ["contents"] as const;

export function useContents(
  page?: number,
  pageSize?: number,
  q?: string,
  sortBy?: string,
  sortDir?: "asc" | "desc",
  format?: string,
  status?: string,
) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [
      ...CONTENTS_KEY,
      page,
      pageSize,
      q,
      sortBy,
      sortDir,
      format,
      status,
    ],
    queryFn: () => {
      const params: Record<string, number | string> = {};
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
      if (q) params.q = q;
      if (sortBy?.trim()) params.sort_by = sortBy;
      if (sortDir) params.sort_dir = sortDir;
      if (format) params.format = format;
      if (status) params.status = status;
      return api.get<{
        items: ContentListItem[];
        page: number;
        page_size: number;
        total: number;
        page_count: number;
      }>("/contents", params);
    },
  });
}

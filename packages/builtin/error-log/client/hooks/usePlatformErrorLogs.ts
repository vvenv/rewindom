import { api } from "@rewindom/client-kit";
import { keepPreviousData, useQuery } from "@tanstack/react-query";


import type { ErrorLog } from "../../shared/index.js";

const PLATFORM_ERROR_LOGS_KEY = ["platform", "error-logs"] as const;

export function usePlatformErrorLogs(
  level?: string,
  userId?: string,
  q?: string,
  tenantSlug?: string,
  startDate?: string,
  endDate?: string,
  page?: number,
  pageSize?: number,
  sortBy?: string,
  sortDir?: "asc" | "desc",
) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [
      ...PLATFORM_ERROR_LOGS_KEY,
      level,
      userId,
      q,
      tenantSlug,
      startDate,
      endDate,
      page,
      pageSize,
      sortBy,
      sortDir,
    ],
    queryFn: () => {
      const params: Record<string, string | number> = {};
      if (level?.trim()) params.level = level;
      if (userId?.trim()) params.user_id = userId;
      if (q?.trim()) params.q = q;
      if (tenantSlug?.trim()) params.tenant_slug = tenantSlug;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
      if (sortBy?.trim()) params.sort_by = sortBy;
      if (sortDir) params.sort_dir = sortDir;
      return api.get<{
        items: ErrorLog[];
        page: number;
        page_size: number;
        total: number;
        page_count: number;
      }>("/platform/error-logs", params);
    },
  });
}

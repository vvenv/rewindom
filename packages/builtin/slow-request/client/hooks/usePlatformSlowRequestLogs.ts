import { api } from "@rewindom/client-kit";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { SlowRequestLogItem } from "../../shared/index.js";

const PLATFORM_SLOW_REQUEST_LOGS_KEY = ["platform", "slow-request-logs"] as const;

export function usePlatformSlowRequestLogs(
  route?: string,
  method?: string,
  minDurationMs?: number,
  statusCode?: number,
  tenantSlug?: string,
  startDate?: string,
  endDate?: string,
  page?: number,
  pageSize?: number,
  sortBy?: string,
  sortDir?: string,
) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [
      ...PLATFORM_SLOW_REQUEST_LOGS_KEY,
      route,
      method,
      minDurationMs,
      statusCode,
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
      if (route?.trim()) params.route = route;
      if (method?.trim()) params.method = method;
      if (minDurationMs !== undefined) params.min_duration_ms = minDurationMs;
      if (statusCode !== undefined) params.status_code = statusCode;
      if (tenantSlug?.trim()) params.tenant_slug = tenantSlug;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
      if (sortBy?.trim()) params.sort_by = sortBy;
      if (sortDir?.trim()) params.sort_dir = sortDir;
      return api.get<{
        items: SlowRequestLogItem[];
        page: number;
        page_size: number;
        total: number;
        page_count: number;
      }>("/platform/slow-request-logs", params);
    },
  });
}

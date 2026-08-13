import { api } from "@rewindom/client-kit";
import { keepPreviousData, useQuery } from "@tanstack/react-query";


import type { SlowQueryLogItem } from "../../shared/index.js";

const PLATFORM_SLOW_QUERY_LOGS_KEY = ["platform", "slow-query-logs"] as const;

export function usePlatformSlowQueryLogs(
  route?: string,
  fingerprint?: string,
  minDurationMs?: number,
  source?: string,
  tenantSlug?: string,
  startDate?: string,
  endDate?: string,
  page?: number,
  pageSize?: number,
  sortBy?: string,
  sortOrder?: string,
) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [
      ...PLATFORM_SLOW_QUERY_LOGS_KEY,
      route,
      fingerprint,
      minDurationMs,
      source,
      tenantSlug,
      startDate,
      endDate,
      page,
      pageSize,
      sortBy,
      sortOrder,
    ],
    queryFn: () => {
      const params: Record<string, string | number> = {};
      if (route?.trim()) params.route = route;
      if (fingerprint?.trim()) params.fingerprint = fingerprint;
      if (minDurationMs !== undefined) params.min_duration_ms = minDurationMs;
      if (source?.trim()) params.source = source;
      if (tenantSlug?.trim()) params.tenant_slug = tenantSlug;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
      if (sortBy?.trim()) params.sort_by = sortBy;
      if (sortOrder?.trim()) params.sort_order = sortOrder;
      return api.get<{
        items: SlowQueryLogItem[];
        page: number;
        page_size: number;
        total: number;
        page_count: number;
      }>("/platform/slow-query-logs", params);
    },
  });
}

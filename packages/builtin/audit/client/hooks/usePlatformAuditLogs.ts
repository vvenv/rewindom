import { api } from "@rewindom/client-kit";
import { keepPreviousData, useQuery } from "@tanstack/react-query";


import type { PlatformAuditLog } from "../../shared/index.js";

const PLATFORM_AUDIT_LOGS_KEY = ["platform", "audit-logs"] as const;

export function usePlatformAuditLogs(
  action?: string,
  username?: string,
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
      ...PLATFORM_AUDIT_LOGS_KEY,
      action,
      username,
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
      if (action?.trim()) params.action = action;
      if (username?.trim()) params.username = username;
      if (tenantSlug?.trim()) params.tenant_slug = tenantSlug;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
      if (sortBy?.trim()) params.sort_by = sortBy;
      if (sortDir) params.sort_dir = sortDir;
      return api.get<{
        items: PlatformAuditLog[];
        page: number;
        page_size: number;
        total: number;
        page_count: number;
      }>("/platform/audit-logs", params);
    },
  });
}

import { api, useTenantQueryScope } from "@rewindom/client-kit";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { type AuditLog } from "../../shared/index.js";

const AUDIT_LOGS_KEY = ["audit-logs"] as const;

/**
 * 租户侧审计日志。服务端按 `audit_logs.read` 决定可见范围：
 * 有权限看本租户全量，没有则强制只返回本人（`user_id` / `username` 入参被忽略）。
 */
export function useAuditLogs(
  action?: string,
  username?: string,
  startDate?: string,
  endDate?: string,
  page?: number,
  pageSize?: number,
  sortBy?: string,
  sortDir?: "asc" | "desc",
) {
  const tenantScope = useTenantQueryScope();
  const enabled = tenantScope !== null;

  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [
      ...AUDIT_LOGS_KEY,
      tenantScope,
      action,
      username,
      startDate,
      endDate,
      page,
      pageSize,
      sortBy,
      sortDir,
    ],
    enabled,
    queryFn: () => {
      const params: Record<string, string | number> = {};
      if (action?.trim()) params.action = action;
      if (username?.trim()) params.username = username;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
      if (sortBy?.trim()) params.sort_by = sortBy;
      if (sortDir) params.sort_dir = sortDir;
      return api.get<{
        items: AuditLog[];
        page: number;
        page_size: number;
        total: number;
        page_count: number;
      }>("/audit-logs", params);
    },
  });
}

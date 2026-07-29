import { api, useTenantQueryScope } from "@be-water/client-kit";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { ErrorLog } from "../../shared/index.js";

const ERROR_LOGS_KEY = ["error-logs"] as const;

/**
 * 租户侧错误日志。服务端按 `error_logs.read` 决定可见范围：
 * 有权限看本租户全量，没有则强制只返回本人（`user_id` 入参被忽略）。
 */
export function useErrorLogs(
  level?: string,
  user_id?: string,
  q?: string,
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
      ...ERROR_LOGS_KEY,
      tenantScope,
      level,
      user_id,
      q,
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
      if (level?.trim()) params.level = level;
      if (user_id?.trim()) params.user_id = user_id;
      if (q?.trim()) params.q = q;
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
      }>("/error-logs", params);
    },
  });
}

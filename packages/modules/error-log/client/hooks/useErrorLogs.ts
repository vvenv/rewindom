import { api, useTenantQueryScope  } from "@be-water/client-kit";
import { useQuery } from "@tanstack/react-query";


import type { ErrorLog } from "../../shared/index.js";

const ERROR_LOGS_KEY = ["error-logs"] as const;

export function useErrorLogs(
  level?: string,
  user_id?: string,
  q?: string,
  startDate?: string,
  endDate?: string,
  page?: number,
  pageSize?: number,
) {
  const tenantScope = useTenantQueryScope();
  const enabled = tenantScope !== null;

  return useQuery({
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
    ],
    enabled,
    queryFn: () => {
      const params: Record<string, string | number> = {};
      if (level && level.trim()) params.level = level;
      if (user_id && user_id.trim()) params.user_id = user_id;
      if (q && q.trim()) params.q = q;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
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

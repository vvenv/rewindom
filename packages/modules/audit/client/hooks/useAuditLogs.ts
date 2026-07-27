import { api, useTenantQueryScope  } from "@be-water/client-kit";
import { useQuery } from "@tanstack/react-query";


import { type AuditLog } from "../../shared/index.js";


const AUDIT_LOGS_KEY = ["audit-logs"] as const;

export function useAuditLogs(
  action?: string,
  user_id?: string,
  startDate?: string,
  endDate?: string,
  page?: number,
  pageSize?: number,
) {
  const tenantScope = useTenantQueryScope();
  const enabled = tenantScope !== null;

  return useQuery({
    queryKey: [
      ...AUDIT_LOGS_KEY,
      tenantScope,
      action,
      user_id,
      startDate,
      endDate,
      page,
      pageSize,
    ],
    enabled,
    queryFn: () => {
      const params: Record<string, string | number> = {};
      if (action && action.trim()) params.action = action;
      if (user_id && user_id.trim()) params.user_id = user_id;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
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

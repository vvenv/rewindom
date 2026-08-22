import { api, useTenantQueryScope } from "@rewindom/client-kit";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type {
  MailDeliveryListItem,
  MailerConfigStatus,
} from "../../shared/index.js";

export const MAILER_KEY = ["mailer"] as const;

export function useMailerConfig() {
  const tenantScope = useTenantQueryScope();
  return useQuery({
    queryKey: [...MAILER_KEY, "config", tenantScope],
    enabled: tenantScope !== null,
    queryFn: () => api.get<MailerConfigStatus>("/mailer/config"),
  });
}

export interface MailDeliveriesQuery {
  q?: string;
  status?: string;
  source?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface MailDeliveriesResult {
  items: MailDeliveryListItem[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

export function useMailDeliveries(query: MailDeliveriesQuery) {
  const tenantScope = useTenantQueryScope();
  return useQuery({
    // 翻页与改排序时保留上一页数据，表格不会整块闪白
    placeholderData: keepPreviousData,
    queryKey: [
      ...MAILER_KEY,
      "deliveries",
      tenantScope,
      query.q,
      query.status,
      query.source,
      query.page,
      query.pageSize,
      query.sortBy,
      query.sortDir,
    ],
    enabled: tenantScope !== null,
    queryFn: () => {
      const params: Record<string, string | number> = {};
      if (query.q?.trim()) params.q = query.q;
      if (query.status?.trim()) params.status = query.status;
      if (query.source?.trim()) params.source = query.source;
      if (query.page !== undefined) params.page = query.page;
      if (query.pageSize !== undefined) params.page_size = query.pageSize;
      if (query.sortBy?.trim()) params.sort_by = query.sortBy;
      if (query.sortDir) params.sort_dir = query.sortDir;
      return api.get<MailDeliveriesResult>("/mailer", params);
    },
  });
}

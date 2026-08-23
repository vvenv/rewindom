import { api, useTenantQueryScope } from "@rewindom/module-sdk/client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type {
  NewsletterDigestRunItem,
  NewsletterList,
  NewsletterSubscriberListItem,
} from "../../shared/index.js";

export const NEWSLETTER_KEY = ["newsletter"] as const;

export interface SubscribersQuery {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface SubscribersResult {
  items: NewsletterSubscriberListItem[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

export function useNewsletterSubscribers(query: SubscribersQuery) {
  const tenantScope = useTenantQueryScope();
  return useQuery({
    // 翻页与改排序时保留上一页，表格不整块闪白
    placeholderData: keepPreviousData,
    queryKey: [
      ...NEWSLETTER_KEY,
      "subscribers",
      tenantScope,
      query.q,
      query.status,
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
      if (query.page !== undefined) params.page = query.page;
      if (query.pageSize !== undefined) params.page_size = query.pageSize;
      if (query.sortBy?.trim()) params.sort_by = query.sortBy;
      if (query.sortDir) params.sort_dir = query.sortDir;
      return api.get<SubscribersResult>("/newsletter", params);
    },
  });
}

export function useNewsletterLists() {
  const tenantScope = useTenantQueryScope();
  return useQuery({
    queryKey: [...NEWSLETTER_KEY, "lists", tenantScope],
    enabled: tenantScope !== null,
    queryFn: () => api.get<{ items: NewsletterList[] }>("/newsletter/lists"),
  });
}

export function useNewsletterRuns() {
  const tenantScope = useTenantQueryScope();
  return useQuery({
    queryKey: [...NEWSLETTER_KEY, "runs", tenantScope],
    enabled: tenantScope !== null,
    queryFn: () =>
      api.get<{ items: NewsletterDigestRunItem[] }>("/newsletter/runs"),
  });
}

import { api } from "@be-water/client-kit";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type {
  BillingListResult,
  BillingPayment,
  BillingSubscription,
} from "../../shared/index.js";

const PLATFORM_BILLING_KEY = ["platform", "billing"] as const;

export function usePlatformBillingSubscriptions(params: {
  page?: number;
  pageSize?: number;
  plan_slug?: string;
  status?: string;
  tenant_id?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [...PLATFORM_BILLING_KEY, "subscriptions", params],
    queryFn: () => {
      const query: Record<string, number | string> = {};
      if (params.page !== undefined) query.page = params.page;
      if (params.pageSize !== undefined) query.page_size = params.pageSize;
      if (params.plan_slug) query.plan_slug = params.plan_slug;
      if (params.status) query.status = params.status;
      if (params.tenant_id) query.tenant_id = params.tenant_id;
      if (params.sortBy?.trim()) query.sort_by = params.sortBy;
      if (params.sortDir) query.sort_dir = params.sortDir;
      return api.get<BillingListResult<BillingSubscription>>(
        "/platform/billing/subscriptions",
        query,
      );
    },
  });
}

export function usePlatformBillingPayments(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  tenant_id?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [...PLATFORM_BILLING_KEY, "payments", params],
    queryFn: () => {
      const query: Record<string, number | string> = {};
      if (params.page !== undefined) query.page = params.page;
      if (params.pageSize !== undefined) query.page_size = params.pageSize;
      if (params.status) query.status = params.status;
      if (params.tenant_id) query.tenant_id = params.tenant_id;
      if (params.sortBy?.trim()) query.sort_by = params.sortBy;
      if (params.sortDir) query.sort_dir = params.sortDir;
      return api.get<BillingListResult<BillingPayment>>(
        "/platform/billing/payments",
        query,
      );
    },
  });
}

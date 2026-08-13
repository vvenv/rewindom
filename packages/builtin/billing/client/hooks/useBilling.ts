import { api } from "@rewindom/client-kit";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type {
  BillingListResult,
  BillingPayment,
  BillingPlanOffer,
  BillingSubscription,
} from "../../shared/index.js";

const BILLING_KEY = ["billing"] as const;

/**
 * `refetchInterval` 只在付款回跳后的等待窗口里给值（见 `use-billing-page.ts`）：
 * 开通由 webhook 落库，回跳先到是常态，这段时间不轮询就只能让用户自己刷新。
 */
export function useBillingSubscription(refetchInterval: number | false = false) {
  return useQuery({
    queryKey: [...BILLING_KEY, "subscription"],
    queryFn: () =>
      api.get<BillingSubscription | null>("/billing/subscription"),
    refetchInterval,
  });
}

export function useBillingPlans() {
  return useQuery({
    queryKey: [...BILLING_KEY, "plans"],
    queryFn: () => api.get<BillingPlanOffer[]>("/billing/plans"),
  });
}

export function useBillingPayments(
  page?: number,
  pageSize?: number,
  sortBy?: string,
  sortDir?: "asc" | "desc",
) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [...BILLING_KEY, "payments", page, pageSize, sortBy, sortDir],
    queryFn: () => {
      const params: Record<string, number | string> = {};
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
      if (sortBy?.trim()) params.sort_by = sortBy;
      if (sortDir) params.sort_dir = sortDir;
      return api.get<BillingListResult<BillingPayment>>(
        "/billing/payments",
        params,
      );
    },
  });
}

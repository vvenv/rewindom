import { api } from "@be-water/client-kit";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type {
  MemberPaymentSummary,
  MemberPlanDetail,
  MemberSubscriptionSummary,
  SiteBillingListResult,
  SiteBillingProviderStatus,
} from "../../shared/site-billing.js";

const SITE_BILLING_KEY = ["site-billing"] as const;

/** 列表查询参数：与服务端的 query 一致（`snake_case` 由 api 层照原样发出）。 */
export interface MemberRecordQuery {
  page: number;
  pageSize: number;
  status?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  /** 只有当前 tab 的那张表发请求，另一张不必占用配额。 */
  enabled?: boolean;
}

function recordParams(query: MemberRecordQuery) {
  return {
    page: query.page,
    page_size: query.pageSize,
    ...(query.status ? { status: query.status } : {}),
    ...(query.sortBy ? { sort_by: query.sortBy } : {}),
    ...(query.sortDir ? { sort_dir: query.sortDir } : {}),
  };
}

export function useMemberPlans() {
  return useQuery({
    queryKey: [...SITE_BILLING_KEY, "plans"],
    queryFn: () => api.get<MemberPlanDetail[]>("/site-billing/plans"),
  });
}

export function useMemberSubscriptions(query: MemberRecordQuery) {
  const params = recordParams(query);
  return useQuery({
    placeholderData: keepPreviousData,
    enabled: query.enabled ?? true,
    queryKey: [...SITE_BILLING_KEY, "subscriptions", params],
    queryFn: () =>
      api.get<SiteBillingListResult<MemberSubscriptionSummary>>(
        "/site-billing/subscriptions",
        params,
      ),
  });
}

export function useMemberPayments(query: MemberRecordQuery) {
  const params = recordParams(query);
  return useQuery({
    placeholderData: keepPreviousData,
    enabled: query.enabled ?? true,
    queryKey: [...SITE_BILLING_KEY, "payments", params],
    queryFn: () =>
      api.get<SiteBillingListResult<MemberPaymentSummary>>(
        "/site-billing/payments",
        params,
      ),
  });
}

export function useSiteBillingProvider() {
  return useQuery({
    queryKey: [...SITE_BILLING_KEY, "provider"],
    queryFn: () =>
      api.get<SiteBillingProviderStatus>("/site-billing/provider"),
  });
}

export { SITE_BILLING_KEY };

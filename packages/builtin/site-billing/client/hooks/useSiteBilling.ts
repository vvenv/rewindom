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

export function useMemberPlans() {
  return useQuery({
    queryKey: [...SITE_BILLING_KEY, "plans"],
    queryFn: () => api.get<MemberPlanDetail[]>("/site-billing/plans"),
  });
}

export function useMemberSubscriptions(page: number, pageSize: number) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [...SITE_BILLING_KEY, "subscriptions", page, pageSize],
    queryFn: () =>
      api.get<SiteBillingListResult<MemberSubscriptionSummary>>(
        "/site-billing/subscriptions",
        { page, page_size: pageSize },
      ),
  });
}

export function useMemberPayments(page: number, pageSize: number) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [...SITE_BILLING_KEY, "payments", page, pageSize],
    queryFn: () =>
      api.get<SiteBillingListResult<MemberPaymentSummary>>(
        "/site-billing/payments",
        { page, page_size: pageSize },
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

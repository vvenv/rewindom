import { api } from "@be-water/client-kit";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { SITE_BILLING_KEY } from "./useSiteBilling.js";

import type {
  MemberPlanDetail,
  MemberPlanWriteBody,
  SiteBillingProviderBody,
  SiteBillingProviderStatus,
} from "../../shared/site-billing.js";

function useInvalidate() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: [...SITE_BILLING_KEY] });
}

export function useSaveMemberPlan() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { id?: string; body: MemberPlanWriteBody }) =>
      input.id
        ? api.put<MemberPlanDetail>(`/site-billing/plans/${input.id}`, input.body)
        : api.post<MemberPlanDetail>("/site-billing/plans", input.body),
    onSuccess: invalidate,
  });
}

export function useDeleteMemberPlan() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ deleted: boolean }>(`/site-billing/plans/${id}`),
    onSuccess: invalidate,
  });
}

export function useSaveSiteBillingProvider() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: SiteBillingProviderBody) =>
      api.put<SiteBillingProviderStatus>("/site-billing/provider", body),
    onSuccess: invalidate,
  });
}

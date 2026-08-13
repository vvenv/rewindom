import { api } from "@rewindom/client-kit";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  BillingSubscription,
  CreateCheckoutResponse,
} from "../../shared/index.js";

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (plan_slug: string) =>
      api.post<CreateCheckoutResponse>("/billing/checkouts", { plan_slug }),
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<BillingSubscription>("/billing/subscription/cancel", {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}

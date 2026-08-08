import { api } from "@be-water/client-kit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";


import type { PlanLimitTemplates } from "../../shared/index.js";

export const PLAN_LIMIT_TEMPLATES_KEY = ["platform", "plan-limits"] as const;

interface PlanLimitTemplatesResponse {
  templates: PlanLimitTemplates;
}

export function usePlanLimitTemplates() {
  return useQuery({
    queryKey: PLAN_LIMIT_TEMPLATES_KEY,
    queryFn: () => api.get<PlanLimitTemplatesResponse>("/platform/plan-limits"),
  });
}

export function useUpdatePlanLimitTemplates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templates: PlanLimitTemplates) =>
      api.put<PlanLimitTemplatesResponse>("/platform/plan-limits", {
        templates,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: PLAN_LIMIT_TEMPLATES_KEY,
      });
    },
  });
}

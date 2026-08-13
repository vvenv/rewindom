import { api } from "@rewindom/client-kit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  PlanPricingConfig,
  ResolvedPlan,
} from "../../shared/plan-pricing.js";

interface PlanPricingResponse {
  /** 代码默认值 + 存储覆盖后的完整表（页面表单的初值）。 */
  catalog: ResolvedPlan[];
  /** 只有被显式改过的那些字段（保存时整包回传）。 */
  overrides: PlanPricingConfig;
}

const PLAN_PRICING_KEY = ["platform", "plan-pricing"] as const;

export function usePlanPricing() {
  return useQuery({
    queryKey: PLAN_PRICING_KEY,
    queryFn: () => api.get<PlanPricingResponse>("/platform/plan-pricing"),
  });
}

export function useSavePlanPricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: PlanPricingConfig) =>
      api.put<{ catalog: ResolvedPlan[] }>("/platform/plan-pricing", config),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PLAN_PRICING_KEY });
      // 官网定价区读的是公开接口，改完价要让预览也跟着换
      await queryClient.invalidateQueries({ queryKey: ["public", "plans"] });
    },
  });
}

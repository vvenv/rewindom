import { api } from "@rewindom/client-kit";
import { useQuery } from "@tanstack/react-query";

import type { ResolvedPlan } from "../../../platform/shared/plan-pricing.js";

/**
 * 官网定价区展示的那几档 —— 免认证的公开接口。
 *
 * 主题编辑器的预览读它：预览要画的正是访客会看见的东西，不该因为编辑者不是平台
 * 管理员就退化成占位样张。这份数据本来就印在公开定价页上，没有秘密可言。
 */
export function usePublicPlans() {
  return useQuery({
    queryKey: ["public", "plans"],
    queryFn: () => api.get<ResolvedPlan[]>("/public/plans", undefined, true),
    // 定价一天也改不了一次，预览里没必要反复拉
    staleTime: 5 * 60 * 1000,
  });
}

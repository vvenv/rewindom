import type { PlanSlug } from "./pricing-plans.js";
import type { TenantFeatureFlags } from "@be-water/shared";

export interface UsageItem {
  used: number;
  limit: number | null;
  percentage: number;
}

export interface UsageStats {
  plan: {
    slug: PlanSlug;
    name: string;
    price_monthly: number | null;
  };
  /**
   * 内置维度只有 `max_users`（`User` 是内核 model）。业务维度由模块经
   * `registerTenantMetricCounter` 登记，需要暴露时在此按需扩展。
   */
  limits: {
    max_users: UsageItem;
  };
  features: TenantFeatureFlags;
  can_upgrade_to: PlanSlug[];
  upgrade_url: string;
  show_usage_card: boolean;
}

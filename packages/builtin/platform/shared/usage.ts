import type { PlanSlug } from "./pricing-plans.js";
import type { TenantFeatureFlags } from "@be-water/shared";

export interface UsageItem {
  used: number;
  limit: number | null;
  percentage: number;
}

export interface UsageStats {
  /**
   * 只带 slug 与价格：套餐名是按语言的（`PlanDefinition.name`），服务端替消费方
   * 挑一门语言只会挑错——消费方拿 slug 自己译（`translatePlanName` / `planName`）。
   */
  plan: {
    slug: PlanSlug;
    /** 单位分；展示由消费方按语言格式化（`formatPlanPrice`）。 */
    price_cents: number | null;
    currency: string;
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

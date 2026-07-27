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
  limits: {
    max_documents: UsageItem;
    max_products: UsageItem;
    max_analyses_per_month: UsageItem;
    max_users: UsageItem;
    analyses_per_day: UsageItem;
  };
  features: TenantFeatureFlags;
  can_upgrade_to: PlanSlug[];
  upgrade_url: string;
  show_usage_card: boolean;
}

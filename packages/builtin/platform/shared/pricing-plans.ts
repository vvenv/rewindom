import type { TenantFeatureFlags } from "@be-water/shared";

export type PlanSlug =
  | "free"
  | "starter"
  | "pro"
  | "business"
  | "enterprise"
  | "ultimate";

/**
 * 用量配额 key。上游只保留与底座本身相关的 `max_users`；
 * 业务配额由下游产品仓按自己的域追加（同时扩展 `TENANT_LIMIT_REGISTRY`）。
 */
export type TenantLimitKey = "max_users";

export interface TenantLimitValues {
  max_users: number | null;
}

export interface PlanDefinition {
  slug: PlanSlug;
  price_monthly: number | null;
  shows_usage_card: boolean;
  features: Partial<TenantFeatureFlags>;
  limits: Partial<TenantLimitValues>;
}

export const PRICING_PLANS: Record<PlanSlug, PlanDefinition> = {
  free: {
    slug: "free",
    price_monthly: 0,
    shows_usage_card: true,
    features: {},
    limits: {
      max_users: 1,
    },
  },
  starter: {
    slug: "starter",
    price_monthly: 99,
    shows_usage_card: true,
    features: {},
    limits: {
      max_users: 3,
    },
  },
  pro: {
    slug: "pro",
    price_monthly: 399,
    shows_usage_card: true,
    features: {},
    limits: {
      max_users: 10,
    },
  },
  business: {
    slug: "business",
    price_monthly: 999,
    shows_usage_card: true,
    features: {},
    limits: {
      max_users: 30,
    },
  },
  enterprise: {
    slug: "enterprise",
    price_monthly: null,
    shows_usage_card: true,
    features: {},
    limits: {
      max_users: 100,
    },
  },
  ultimate: {
    slug: "ultimate",
    price_monthly: null,
    shows_usage_card: false,
    features: {},
    limits: {
      max_users: null,
    },
  },
};

export const PLAN_SLUGS: PlanSlug[] = Object.keys(PRICING_PLANS) as PlanSlug[];

export function shouldShowUsageCard(planSlug: PlanSlug): boolean {
  return PRICING_PLANS[planSlug].shows_usage_card;
}

export function getPlanBySlug(slug: string): PlanDefinition | undefined {
  return PRICING_PLANS[slug as PlanSlug];
}

export function isValidPlanSlug(slug: string): slug is PlanSlug {
  return slug in PRICING_PLANS;
}

/** 价格高低即套餐高低；未定价（enterprise / ultimate）排在最后。 */
export function comparePlanRank(a: string, b: string): number {
  const priceA = getPlanBySlug(a)?.price_monthly;
  const priceB = getPlanBySlug(b)?.price_monthly;
  if (priceA == null && priceB == null) return 0;
  if (priceA == null) return 1;
  if (priceB == null) return -1;
  return priceA - priceB;
}

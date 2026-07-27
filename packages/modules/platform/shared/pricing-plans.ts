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
  name: string;
  price_monthly: number | null;
  description: string;
  shows_usage_card: boolean;
  features: Partial<TenantFeatureFlags>;
  limits: Partial<TenantLimitValues>;
}

export const PRICING_PLANS: Record<PlanSlug, PlanDefinition> = {
  free: {
    slug: "free",
    name: "免费版",
    price_monthly: 0,
    description: "适合个人试用",
    shows_usage_card: true,
    features: {},
    limits: {
      max_users: 1,
    },
  },
  starter: {
    slug: "starter",
    name: "基础版",
    price_monthly: 99,
    description: "适合小团队起步",
    shows_usage_card: true,
    features: {},
    limits: {
      max_users: 3,
    },
  },
  pro: {
    slug: "pro",
    name: "专业版",
    price_monthly: 399,
    description: "适合成长期团队",
    shows_usage_card: true,
    features: {},
    limits: {
      max_users: 10,
    },
  },
  business: {
    slug: "business",
    name: "商业版",
    price_monthly: 999,
    description: "适合中大型企业",
    shows_usage_card: true,
    features: {},
    limits: {
      max_users: 30,
    },
  },
  enterprise: {
    slug: "enterprise",
    name: "企业版",
    price_monthly: null,
    description: "大客户定制方案，联系销售",
    shows_usage_card: true,
    features: {},
    limits: {
      max_users: 100,
    },
  },
  ultimate: {
    slug: "ultimate",
    name: "终极版",
    price_monthly: null,
    description: "内部租户，无用量限制",
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

export function formatPlanChangeAuditDetails(
  tenantSlug: string,
  before: { plan: string; plan_ends_at: string | null },
  after: { plan: string; plan_ends_at: string | null },
): string {
  const parts = [`tenant=${tenantSlug}`];
  if (before.plan !== after.plan) {
    const beforeName = getPlanBySlug(before.plan)?.name ?? before.plan;
    const afterName = getPlanBySlug(after.plan)?.name ?? after.plan;
    parts.push(`套餐=${beforeName}→${afterName}`);
  }
  if (before.plan_ends_at !== after.plan_ends_at) {
    parts.push(
      `到期=${after.plan_ends_at ? after.plan_ends_at.slice(0, 10) : "不限"}`,
    );
  }
  return parts.join("，");
}

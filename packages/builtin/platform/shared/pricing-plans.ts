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
  /**
   * 每月价格，**单位是分**（同 `MemberPlan.price_cents`）——钱不用浮点数。
   *
   * `null` = 议价档（enterprise / ultimate），定价区上写「联系我们」而不是一个假数字。
   */
  price_cents: number | null;
  /** ISO 4217；展示交给 `Intl.NumberFormat`，符号与位置随访客语言自动适配。 */
  currency: string;
  shows_usage_card: boolean;
  features: Partial<TenantFeatureFlags>;
  limits: Partial<TenantLimitValues>;
  /**
   * 这一档要不要出现在官网定价区上。
   *
   * 在**数据**这一侧而不是段的设置里：官网的套餐区是数据驱动的，编辑器只管版式与
   * 样式，不管「展示哪几档」。`ultimate` 是内部组织用的，摆到公开面上只会让访客
   * 看见一个买不到也不该知道的东西。
   */
  public_listed: boolean;
  /** 定价区里描边突出的那一档（「推荐」）。同样是数据，不是段的设置。 */
  highlighted?: boolean;
}

export const PRICING_PLANS: Record<PlanSlug, PlanDefinition> = {
  free: {
    slug: "free",
    public_listed: true,
    price_cents: 0,
    currency: "CNY",
    shows_usage_card: true,
    features: {},
    limits: {
      max_users: 1,
    },
  },
  starter: {
    slug: "starter",
    public_listed: true,
    price_cents: 9900,
    currency: "CNY",
    shows_usage_card: true,
    features: {},
    limits: {
      max_users: 3,
    },
  },
  pro: {
    slug: "pro",
    public_listed: true,
    highlighted: true,
    price_cents: 39900,
    currency: "CNY",
    shows_usage_card: true,
    features: {},
    limits: {
      max_users: 10,
    },
  },
  business: {
    slug: "business",
    public_listed: true,
    price_cents: 99900,
    currency: "CNY",
    shows_usage_card: true,
    features: {},
    limits: {
      max_users: 30,
    },
  },
  enterprise: {
    slug: "enterprise",
    public_listed: true,
    price_cents: null,
    currency: "CNY",
    shows_usage_card: true,
    features: {},
    limits: {
      max_users: 100,
    },
  },
  ultimate: {
    slug: "ultimate",
    public_listed: false,
    price_cents: null,
    currency: "CNY",
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
  const priceA = getPlanBySlug(a)?.price_cents;
  const priceB = getPlanBySlug(b)?.price_cents;
  if (priceA == null && priceB == null) return 0;
  if (priceA == null) return 1;
  if (priceB == null) return -1;
  return priceA - priceB;
}

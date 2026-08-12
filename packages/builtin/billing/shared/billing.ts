import {
  PLAN_SLUGS,
  PRICING_PLANS,
  type PlanSlug,
} from "../../platform/shared/pricing-plans.js";

export const BILLING_PROVIDER_CREEM = "creem" as const;

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
  "unpaid",
  "paused",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * 可通过自助 checkout 购买的套餐 —— **从 `PRICING_PLANS` 推导**，不再另存一份。
 *
 * 判据就是「不是免费版、而且标了价」：`free` 不用买，`enterprise` / `ultimate`
 * 的 `price_monthly` 是 null（议价 / 内部），自助结账付不出一个没有的价钱。
 * 以前这里是硬编码的 `["starter","pro","business"]`，加一档套餐要改两处，
 * 漏改的那一处不会报错，只会让新套餐在结账页上凭空消失。
 */
export const SELF_SERVE_PLAN_SLUGS: readonly PlanSlug[] = PLAN_SLUGS.filter(
  (slug) => slug !== "free" && PRICING_PLANS[slug].price_monthly != null,
);

export function isSelfServePlanSlug(slug: string): slug is PlanSlug {
  return (SELF_SERVE_PLAN_SLUGS as readonly string[]).includes(slug);
}

export interface BillingSubscription {
  id: string;
  tenant_id: string;
  /** Platform list only — resolved from Tenant. */
  tenant_name?: string | null;
  /** Platform list only — resolved from Tenant. */
  tenant_slug?: string | null;
  plan_slug: string;
  status: SubscriptionStatus;
  provider: string;
  provider_subscription_id: string;
  provider_customer_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillingPayment {
  id: string;
  tenant_id: string;
  /** Platform list only — resolved from Tenant. */
  tenant_name?: string | null;
  /** Platform list only — resolved from Tenant. */
  tenant_slug?: string | null;
  subscription_id: string | null;
  plan_slug: string | null;
  provider: string;
  provider_order_id: string;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  paid_at: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 换挡方向 —— 决定按钮上写什么。
 *
 * `none` 是「当前没有订阅」，此时每一档都是首次开通；`current` 那一档的按钮不该
 * 是可点的「升级」，它是用户现在正在用的东西。
 */
export type PlanChangeKind = "none" | "current" | "upgrade" | "downgrade";

export interface BillingPlanOffer {
  plan_slug: string;
  price_monthly: number | null;
  /** 套餐名与说明按 slug + 语言现取（`translatePlanName` / `planName`），不随接口下发。 */
  checkout_available: boolean;
  change_kind: PlanChangeKind;
}

export interface CreateCheckoutBody {
  plan_slug: string;
}

export interface CreateCheckoutResponse {
  checkout_url: string;
}

export interface BillingListResult<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

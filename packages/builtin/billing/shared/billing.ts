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

/** 可通过自助 checkout 购买的套餐（排除 free / 议价 / 内部）。 */
export const SELF_SERVE_PLAN_SLUGS = ["starter", "pro", "business"] as const;

export type SelfServePlanSlug = (typeof SELF_SERVE_PLAN_SLUGS)[number];

export function isSelfServePlanSlug(slug: string): slug is SelfServePlanSlug {
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

export interface BillingPlanOffer {
  plan_slug: string;
  name: string;
  price_monthly: number | null;
  description: string;
  checkout_available: boolean;
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

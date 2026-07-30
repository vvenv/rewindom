import type {
  BillingPayment,
  BillingSubscription,
  PaymentStatus,
  SubscriptionStatus,
} from "../shared/billing.js";

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function toBillingSubscription(row: {
  id: string;
  tenant_id: string;
  plan_slug: string;
  status: string;
  provider: string;
  provider_subscription_id: string;
  provider_customer_id: string | null;
  current_period_start: Date | null;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
  created_at: Date;
  updated_at: Date;
}): BillingSubscription {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    plan_slug: row.plan_slug,
    status: row.status as SubscriptionStatus,
    provider: row.provider,
    provider_subscription_id: row.provider_subscription_id,
    provider_customer_id: row.provider_customer_id,
    current_period_start: toIso(row.current_period_start),
    current_period_end: toIso(row.current_period_end),
    cancel_at_period_end: row.cancel_at_period_end,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export function toBillingPayment(row: {
  id: string;
  tenant_id: string;
  subscription_id: string | null;
  plan_slug: string | null;
  provider: string;
  provider_order_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  paid_at: Date | null;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}): BillingPayment {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    subscription_id: row.subscription_id,
    plan_slug: row.plan_slug,
    provider: row.provider,
    provider_order_id: row.provider_order_id,
    amount_cents: row.amount_cents,
    currency: row.currency,
    status: row.status as PaymentStatus,
    paid_at: toIso(row.paid_at),
    description: row.description,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

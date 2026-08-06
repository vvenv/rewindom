import { resolveSortField, resolveSortOrder } from "@be-water/server-kernel/http/list-sort.js";
import {
  NotFoundError,
  ValidationError,
} from "@be-water/server-kernel/lib/app-errors.js";
import { config } from "@be-water/server-kernel/lib/config.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { withTenantScope } from "@be-water/server-kernel/lib/tenant-scope.js";

import { updateTenantPlan } from "../../platform/server/services/tenant-management.service.js";
import {
  getPlanBySlug,
  PRICING_PLANS,
  type PlanSlug,
} from "../../platform/shared/pricing-plans.js";
import {
  BILLING_PROVIDER_CREEM,
  isSelfServePlanSlug,
  SELF_SERVE_PLAN_SLUGS,
  type BillingListResult,
  type BillingPayment,
  type BillingPlanOffer,
  type BillingSubscription,
  type SubscriptionStatus,
} from "../shared/index.js";

import { toBillingPayment, toBillingSubscription } from "./billing.mapper.js";
import {
  getCreemProductId,
  getCreemProvider,
  isCreemConfigured,
} from "./providers/creem.provider.js";

const ACTIVE_STATUSES: SubscriptionStatus[] = [
  "active",
  "trialing",
  "past_due",
];

const PAYMENT_SORTABLE = new Set([
  "created_at",
  "paid_at",
  "amount_cents",
  "status",
]);

const SUBSCRIPTION_SORTABLE = new Set([
  "created_at",
  "updated_at",
  "status",
  "plan_slug",
]);

export function listBillingPlanOffers(): BillingPlanOffer[] {
  return SELF_SERVE_PLAN_SLUGS.map((slug) => {
    const plan = PRICING_PLANS[slug];
    return {
      plan_slug: slug,
      name: plan.name,
      price_monthly: plan.price_monthly,
      description: plan.description,
      checkout_available: Boolean(getCreemProductId(slug)),
    };
  });
}

export async function getCurrentSubscription(
  tenantId: string,
): Promise<BillingSubscription | null> {
  const row = await prisma.subscription.findFirst({
    where: withTenantScope(tenantId, {
      status: { in: ACTIVE_STATUSES },
    }),
    orderBy: { updated_at: "desc" },
  });
  return row ? toBillingSubscription(row) : null;
}

export async function listTenantPayments(params: {
  tenant_id: string;
  page: number;
  page_size: number;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}): Promise<BillingListResult<BillingPayment>> {
  const { tenant_id, page, page_size, sort_by, sort_dir } = params;
  const field = resolveSortField(sort_by, PAYMENT_SORTABLE, "created_at");
  const order = resolveSortOrder(sort_dir, "desc");
  const where = withTenantScope(tenant_id, {});
  const skip = (page - 1) * page_size;

  const [rows, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { [field]: order },
      skip,
      take: page_size,
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    items: rows.map(toBillingPayment),
    page,
    page_size,
    total,
    page_count: Math.ceil(total / page_size),
  };
}

export async function createCheckoutSession(input: {
  tenant_id: string;
  plan_slug: string;
  customer_email?: string;
  user_id: string;
}): Promise<{ checkout_url: string }> {
  if (!isSelfServePlanSlug(input.plan_slug)) {
    throw new ValidationError("billing.plan_not_self_serve");
  }
  if (!isCreemConfigured()) {
    throw new ValidationError("billing.creem_api_key_missing_checkout");
  }
  const productId = getCreemProductId(input.plan_slug);
  if (!productId) {
    throw new ValidationError("billing.product_unconfigured", {
      plan_slug: input.plan_slug,
    });
  }

  const plan = getPlanBySlug(input.plan_slug);
  if (!plan) {
    throw new ValidationError("plan.invalid");
  }

  const frontendUrl = config.frontend.url.replace(/\/$/, "");
  // 租户工作台路由统一在 /app/* 之下；`/billing` 现在归租户 CMS，付款回跳会落到 404
  const successUrl = `${frontendUrl}/app/billing?checkout=success`;

  const provider = getCreemProvider();
  const result = await provider.createCheckout({
    product_id: productId,
    success_url: successUrl,
    customer_email: input.customer_email,
    request_id: `${input.tenant_id}:${input.plan_slug}:${Date.now()}`,
    metadata: {
      tenant_id: input.tenant_id,
      plan_slug: input.plan_slug,
      user_id: input.user_id,
    },
  });

  return { checkout_url: result.checkout_url };
}

export async function cancelCurrentSubscription(input: {
  tenant_id: string;
}): Promise<BillingSubscription> {
  const current = await prisma.subscription.findFirst({
    where: withTenantScope(input.tenant_id, {
      status: { in: ACTIVE_STATUSES },
    }),
    orderBy: { updated_at: "desc" },
  });
  if (!current) {
    throw new NotFoundError("billing.no_cancellable_subscription");
  }
  if (!isCreemConfigured()) {
    throw new ValidationError("billing.creem_api_key_missing_cancel");
  }

  const provider = getCreemProvider();
  const result = await provider.cancelSubscription({
    provider_subscription_id: current.provider_subscription_id,
    mode: "scheduled",
  });

  const updated = await prisma.subscription.update({
    where: withTenantScope(input.tenant_id, { id: current.id }),
    data: {
      cancel_at_period_end: result.cancel_at_period_end,
      status: result.cancel_at_period_end ? current.status : "canceled",
    },
  });

  return toBillingSubscription(updated);
}

export async function listPlatformSubscriptions(params: {
  page: number;
  page_size: number;
  plan_slug?: string;
  status?: string;
  tenant_id?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}): Promise<BillingListResult<BillingSubscription>> {
  const field = resolveSortField(
    params.sort_by,
    SUBSCRIPTION_SORTABLE,
    "updated_at",
  );
  const order = resolveSortOrder(params.sort_dir, "desc");
  const where = {
    ...(params.plan_slug ? { plan_slug: params.plan_slug } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.tenant_id ? { tenant_id: params.tenant_id } : {}),
  };
  const skip = (params.page - 1) * params.page_size;

  const [rows, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      orderBy: { [field]: order },
      skip,
      take: params.page_size,
    }),
    prisma.subscription.count({ where }),
  ]);

  return {
    items: rows.map(toBillingSubscription),
    page: params.page,
    page_size: params.page_size,
    total,
    page_count: Math.ceil(total / params.page_size),
  };
}

export async function listPlatformPayments(params: {
  page: number;
  page_size: number;
  status?: string;
  tenant_id?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}): Promise<BillingListResult<BillingPayment>> {
  const field = resolveSortField(params.sort_by, PAYMENT_SORTABLE, "created_at");
  const order = resolveSortOrder(params.sort_dir, "desc");
  const where = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.tenant_id ? { tenant_id: params.tenant_id } : {}),
  };
  const skip = (params.page - 1) * params.page_size;

  const [rows, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { [field]: order },
      skip,
      take: params.page_size,
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    items: rows.map(toBillingPayment),
    page: params.page,
    page_size: params.page_size,
    total,
    page_count: Math.ceil(total / params.page_size),
  };
}

export async function applyGrantedPlan(input: {
  tenant_id: string;
  plan_slug: string;
  plan_ends_at?: string | null;
}): Promise<void> {
  if (!getPlanBySlug(input.plan_slug)) {
    throw new ValidationError("billing.unknown_plan", {
      plan_slug: input.plan_slug,
    });
  }
  await updateTenantPlan(input.tenant_id, {
    plan: input.plan_slug as PlanSlug,
    plan_ends_at: input.plan_ends_at,
  });
}

export async function revokeToFreePlan(tenantId: string): Promise<void> {
  await updateTenantPlan(tenantId, {
    plan: "free",
    plan_ends_at: null,
  });
}

export { BILLING_PROVIDER_CREEM };

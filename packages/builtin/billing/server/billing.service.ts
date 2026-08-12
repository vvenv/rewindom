import { resolveSortField, resolveSortOrder } from "@be-water/server-kernel/http/list-sort.js";
import {
  NotFoundError,
  ValidationError,
} from "@be-water/server-kernel/lib/app-errors.js";
import { config } from "@be-water/server-kernel/lib/config.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import {
  loadTenantLabelsByIds,
  resolveTenantIdBySlug,
} from "@be-water/server-kernel/lib/tenant-labels.js";
import { withTenantScope } from "@be-water/server-kernel/lib/tenant-scope.js";

import { updateTenantPlan } from "../../platform/server/services/tenant-management.service.js";
import {
  comparePlanRank,
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
  type PlanChangeKind,
  type SubscriptionStatus,
} from "../shared/index.js";

import { toBillingPayment, toBillingSubscription } from "./billing.mapper.js";
import {
  getCreemProductId,
  getCreemProvider,
  isCreemConfigured,
} from "./providers/creem.provider.js";

async function withTenantLabels<T extends { tenant_id: string }>(
  items: T[],
): Promise<
  Array<T & { tenant_name: string | null; tenant_slug: string | null }>
> {
  const labels = await loadTenantLabelsByIds(items.map((item) => item.tenant_id));
  return items.map((item) => {
    const label = labels.get(item.tenant_id);
    return {
      ...item,
      tenant_name: label?.name ?? null,
      tenant_slug: label?.slug ?? null,
    };
  });
}

async function resolvePlatformTenantFilter(params: {
  tenant_id?: string;
  tenant_slug?: string;
}): Promise<{ tenant_id?: string; empty: boolean }> {
  if (params.tenant_id?.trim()) {
    return { tenant_id: params.tenant_id.trim(), empty: false };
  }
  const slug = params.tenant_slug?.trim();
  if (!slug) return { empty: false };
  const tenantId = await resolveTenantIdBySlug(slug);
  if (!tenantId) return { empty: true };
  return { tenant_id: tenantId, empty: false };
}

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

function planChangeKind(
  slug: string,
  currentPlanSlug: string | null,
): PlanChangeKind {
  if (!currentPlanSlug) return "none";
  if (slug === currentPlanSlug) return "current";
  return comparePlanRank(slug, currentPlanSlug) > 0 ? "upgrade" : "downgrade";
}

export function listBillingPlanOffers(
  currentPlanSlug: string | null = null,
): BillingPlanOffer[] {
  return SELF_SERVE_PLAN_SLUGS.map((slug) => ({
    plan_slug: slug,
    price_cents: PRICING_PLANS[slug].price_cents,
    currency: PRICING_PLANS[slug].currency,
    checkout_available: Boolean(getCreemProductId(slug)),
    change_kind: planChangeKind(slug, currentPlanSlug),
  }));
}

/**
 * 「当前订阅」的唯一口径 —— 读与写都走它。
 *
 * 排序不能只看 `updated_at`：升档时新旧两条订阅可能同时处于生效状态，而 webhook
 * 是并发到的，`updated_at` 谁在前完全看投递顺序。先按周期末（买得更远的那条更新），
 * 再按 `updated_at`，最后拿 `id` 兜底 —— 三层下来结果是确定的，同一份数据不会
 * 在两次请求里给出两个答案。
 */
function currentSubscriptionQuery(tenantId: string) {
  return {
    where: withTenantScope(tenantId, {
      status: { in: ACTIVE_STATUSES },
    }),
    orderBy: [
      { current_period_end: "desc" as const },
      { updated_at: "desc" as const },
      { id: "desc" as const },
    ],
  };
}

export async function getCurrentSubscription(
  tenantId: string,
): Promise<BillingSubscription | null> {
  const row = await prisma.subscription.findFirst(
    currentSubscriptionQuery(tenantId),
  );
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

/**
 * 这个组织在通道侧的 customer id（没买过就没有）。
 *
 * 不限生效状态：退订之后再回来的还是同一个买家，重开一个 customer 只会让通道后台
 * 里同一家组织散成好几条。
 */
async function findProviderCustomerId(
  tenantId: string,
): Promise<string | undefined> {
  const row = await prisma.subscription.findFirst({
    where: withTenantScope(tenantId, {
      provider: BILLING_PROVIDER_CREEM,
      provider_customer_id: { not: null },
    }),
    orderBy: { updated_at: "desc" },
    select: { provider_customer_id: true },
  });
  return row?.provider_customer_id ?? undefined;
}

export async function createCheckoutSession(input: {
  tenant_id: string;
  plan_slug: string;
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
    customer_id: await findProviderCustomerId(input.tenant_id),
    /*
     * 幂等键，所以**不带时间戳**。带上 `Date.now()` 等于每次点击都是一笔新订单，
     * 这个字段也就白留了：连点两下升级会开出两个 checkout，两边都付掉就是两笔订阅。
     */
    request_id: `${input.tenant_id}:${input.plan_slug}`,
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
  const current = await prisma.subscription.findFirst(
    currentSubscriptionQuery(input.tenant_id),
  );
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
  tenant_slug?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}): Promise<BillingListResult<BillingSubscription>> {
  const field = resolveSortField(
    params.sort_by,
    SUBSCRIPTION_SORTABLE,
    "updated_at",
  );
  const order = resolveSortOrder(params.sort_dir, "desc");
  const tenantFilter = await resolvePlatformTenantFilter(params);
  if (tenantFilter.empty) {
    return {
      items: [],
      page: params.page,
      page_size: params.page_size,
      total: 0,
      page_count: 0,
    };
  }
  const where = {
    ...(params.plan_slug ? { plan_slug: params.plan_slug } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(tenantFilter.tenant_id ? { tenant_id: tenantFilter.tenant_id } : {}),
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
    items: await withTenantLabels(rows.map(toBillingSubscription)),
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
  tenant_slug?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}): Promise<BillingListResult<BillingPayment>> {
  const field = resolveSortField(params.sort_by, PAYMENT_SORTABLE, "created_at");
  const order = resolveSortOrder(params.sort_dir, "desc");
  const tenantFilter = await resolvePlatformTenantFilter(params);
  if (tenantFilter.empty) {
    return {
      items: [],
      page: params.page,
      page_size: params.page_size,
      total: 0,
      page_count: 0,
    };
  }
  const where = {
    ...(params.status ? { status: params.status } : {}),
    ...(tenantFilter.tenant_id ? { tenant_id: tenantFilter.tenant_id } : {}),
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
    items: await withTenantLabels(rows.map(toBillingPayment)),
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

async function revokeToFreePlan(tenantId: string): Promise<void> {
  await updateTenantPlan(tenantId, {
    plan: "free",
    plan_ends_at: null,
  });
}

/**
 * 按**当前还生效的订阅**重算组织套餐 —— 订阅进终态后一律走这里，别再直接降级。
 *
 * 以前 `subscription.canceled` 是无条件 `revokeToFreePlan`。升档的正常路径恰好会
 * 触发它：新订阅开好之后，旧那笔在 Creem 侧被取消，取消事件一到就把整个组织从
 * pro 打回 free —— 用户刚付完钱，权限先没了。
 *
 * 一条不剩才落 free；还剩的按价格取最高那档（同 `comparePlanRank`），因为同时留着
 * 两笔订阅时用户买到的是其中更贵的那份权益。
 */
export async function reconcileTenantPlan(tenantId: string): Promise<void> {
  const alive = await prisma.subscription.findMany({
    where: withTenantScope(tenantId, { status: { in: ACTIVE_STATUSES } }),
    select: { plan_slug: true, current_period_end: true },
  });

  const best = alive
    .filter((row) => getPlanBySlug(row.plan_slug))
    .sort((a, b) => comparePlanRank(b.plan_slug, a.plan_slug))[0];

  if (!best) {
    await revokeToFreePlan(tenantId);
    return;
  }

  await applyGrantedPlan({
    tenant_id: tenantId,
    plan_slug: best.plan_slug,
    plan_ends_at: best.current_period_end?.toISOString() ?? null,
  });
}

export { BILLING_PROVIDER_CREEM };

/**
 * 会员自己那条链路：看得到哪几档、开一次结账、取消自己的订阅。
 *
 * 与运营侧（`site-billing.service.ts`）分开的理由是**鉴权主体不同**：这里的每一个
 * 查询都必须钉在 `member_id` 上。写在一起早晚会有人复用一个「按 tenant 查订阅」的
 * 函数，然后会员就看见了别人的账单。
 */

import {
  NotFoundError,
  ValidationError,
} from "@be-water/server-kernel/lib/app-errors.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { withTenantScope } from "@be-water/server-kernel/lib/tenant-scope.js";

import { createCreemProvider } from "../../billing/server/providers/creem.provider.js";
import {
  MEMBER_ACTIVE_STATUSES,
  SITE_BILLING_PROVIDER_CREEM,
  type MemberPaymentSummary,
  type MemberPlanSummary,
  type MemberSubscriptionSummary,
} from "../shared/site-billing.js";

import { resolveSiteBillingCreem } from "./provider-credentials.js";
import {
  toMemberPayment,
  toMemberPlanSummary,
  toMemberSubscription,
} from "./site-billing.mapper.js";

import type { AppLocale } from "@be-water/shared";

/** 公开面能看到的档：启用 + 配了通道商品。没配商品的那档点下去只会报错。 */
export async function listPurchasablePlans(input: {
  tenant_id: string;
  locale: AppLocale;
  fallback_locale: AppLocale;
}): Promise<MemberPlanSummary[]> {
  const rows = await prisma.memberPlan.findMany({
    where: withTenantScope(input.tenant_id, {
      enabled: true,
      provider_product_id: { not: null },
    }),
    orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
  });
  return rows
    .map((row) =>
      toMemberPlanSummary(row, input.locale, input.fallback_locale),
    )
    .filter((plan) => plan.purchasable);
}

/**
 * 会员当前的订阅。
 *
 * 排序与 billing 的 `currentSubscriptionQuery` 同口径：先看谁买得更远，再看谁更新，
 * 最后拿 id 兜底——换档期间可能短暂并存两条，结果必须是确定的。
 */
export async function getMemberSubscription(input: {
  tenant_id: string;
  member_id: string;
}): Promise<MemberSubscriptionSummary | null> {
  const row = await prisma.memberSubscription.findFirst({
    where: withTenantScope(input.tenant_id, {
      member_id: input.member_id,
      status: { in: MEMBER_ACTIVE_STATUSES },
    }),
    orderBy: [
      { current_period_end: "desc" },
      { updated_at: "desc" },
      { id: "desc" },
    ],
  });
  return row ? toMemberSubscription(row) : null;
}

export async function listOwnPayments(input: {
  tenant_id: string;
  member_id: string;
  limit?: number;
}): Promise<MemberPaymentSummary[]> {
  const rows = await prisma.memberPayment.findMany({
    where: withTenantScope(input.tenant_id, { member_id: input.member_id }),
    orderBy: { created_at: "desc" },
    take: input.limit ?? 10,
  });
  return rows.map(toMemberPayment);
}

/** 这位会员在通道侧的 customer id：复购时带上，别把同一个人开成好几个买家。 */
async function findMemberCustomerId(input: {
  tenant_id: string;
  member_id: string;
}): Promise<string | undefined> {
  const row = await prisma.memberSubscription.findFirst({
    where: withTenantScope(input.tenant_id, {
      member_id: input.member_id,
      provider: SITE_BILLING_PROVIDER_CREEM,
      provider_customer_id: { not: null },
    }),
    orderBy: { updated_at: "desc" },
    select: { provider_customer_id: true },
  });
  return row?.provider_customer_id ?? undefined;
}

export async function createMemberCheckout(input: {
  tenant_id: string;
  member_id: string;
  member_email: string;
  plan_slug: string;
  origin: string;
  return_path: string;
}): Promise<{ checkout_url: string }> {
  const plan = await prisma.memberPlan.findFirst({
    where: withTenantScope(input.tenant_id, {
      slug: input.plan_slug,
      enabled: true,
    }),
  });
  if (!plan) throw new NotFoundError("site_billing.plan_not_found");

  const productId = plan.provider_product_id?.trim();
  if (!productId) {
    throw new ValidationError("site_billing.plan_not_purchasable", {
      slug: input.plan_slug,
    });
  }

  const credentials = await resolveSiteBillingCreem(input.tenant_id);
  if (!credentials.apiKey) {
    throw new ValidationError("site_billing.provider_unconfigured");
  }

  const provider = createCreemProvider(credentials);
  const result = await provider.createCheckout({
    product_id: productId,
    // 回到会员自己的账单页，带上标记好让页面知道「刚付完，等到账」
    success_url: `${input.origin}${input.return_path}?checkout=success`,
    customer_id: await findMemberCustomerId(input),
    customer_email: input.member_email,
    // 幂等键不带时间戳：连点两下不该变成两笔订单
    request_id: `${input.tenant_id}:${input.member_id}:${input.plan_slug}`,
    metadata: {
      // webhook 靠这三个把订单认回来（tenant_id 还用来找验签密钥）
      tenant_id: input.tenant_id,
      member_id: input.member_id,
      plan_slug: input.plan_slug,
      scope: "site-billing",
    },
  });

  return { checkout_url: result.checkout_url };
}

export async function cancelMemberSubscription(input: {
  tenant_id: string;
  member_id: string;
}): Promise<MemberSubscriptionSummary> {
  const current = await prisma.memberSubscription.findFirst({
    where: withTenantScope(input.tenant_id, {
      member_id: input.member_id,
      status: { in: MEMBER_ACTIVE_STATUSES },
    }),
    orderBy: [
      { current_period_end: "desc" },
      { updated_at: "desc" },
      { id: "desc" },
    ],
  });
  if (!current) throw new NotFoundError("site_billing.no_cancellable");

  const credentials = await resolveSiteBillingCreem(input.tenant_id);
  if (!credentials.apiKey) {
    throw new ValidationError("site_billing.provider_unconfigured");
  }

  const provider = createCreemProvider(credentials);
  const result = await provider.cancelSubscription({
    provider_subscription_id: current.provider_subscription_id,
    // 周期末取消：钱已经付到期末了，立刻断掉是在没收剩下的服务
    mode: "scheduled",
  });

  const updated = await prisma.memberSubscription.update({
    where: withTenantScope(input.tenant_id, { id: current.id }),
    data: {
      cancel_at_period_end: result.cancel_at_period_end,
      status: result.cancel_at_period_end ? current.status : "canceled",
    },
  });
  return toMemberSubscription(updated);
}

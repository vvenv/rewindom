/**
 * 站点运营侧的会员付费服务：套餐 CRUD + 会员订阅 / 付款查询。
 *
 * 会员自己那条链路（结账、取消、看自己的账单）在 `member-billing.service.ts`——
 * 两边的鉴权主体不同（工作台用户 vs 站点会员），混在一个文件里迟早会有人把
 * 「会员能看自己的」和「运营能看所有人的」写成同一个查询。
 */

import { resolveSortField, resolveSortOrder } from "@be-water/server-kernel/http/list-sort.js";
import {
  NotFoundError,
  ValidationError,
} from "@be-water/server-kernel/lib/app-errors.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { withTenantScope } from "@be-water/server-kernel/lib/tenant-scope.js";

import {
  isMemberPlanInterval,
  parseLocalizedText,
  type MemberPaymentSummary,
  type MemberPlanDetail,
  type MemberPlanWriteBody,
  type MemberSubscriptionSummary,
  type SiteBillingListResult,
} from "../shared/site-billing.js";

import {
  toMemberPayment,
  toMemberPlanDetail,
  toMemberSubscription,
} from "./site-billing.mapper.js";

import type { Prisma } from "@be-water/server-kernel/generated/prisma/client/client.js";

const SUBSCRIPTION_SORTABLE = new Set([
  "created_at",
  "updated_at",
  "status",
  "plan_slug",
]);

const PAYMENT_SORTABLE = new Set([
  "created_at",
  "paid_at",
  "amount_cents",
  "status",
]);

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/u;

function assertWritable(body: MemberPlanWriteBody): void {
  if (!SLUG_PATTERN.test(body.slug)) {
    throw new ValidationError("site_billing.plan_slug_invalid");
  }
  // 价格是整数分：允许 0（免费档也是一档），但不允许负数或小数
  if (!Number.isInteger(body.price_cents) || body.price_cents < 0) {
    throw new ValidationError("site_billing.plan_price_invalid");
  }
  if (!isMemberPlanInterval(body.interval)) {
    throw new ValidationError("site_billing.plan_interval_invalid");
  }
  const name = parseLocalizedText(body.name);
  if (Object.values(name.__i18n).every((text) => !text.trim())) {
    throw new ValidationError("site_billing.plan_name_required");
  }
}

/** 建一档 / 改一档共用的写入体。 */
function planData(body: MemberPlanWriteBody) {
  return {
    slug: body.slug,
    name: parseLocalizedText(body.name) as unknown as Prisma.InputJsonValue,
    description: parseLocalizedText(
      body.description,
    ) as unknown as Prisma.InputJsonValue,
    price_cents: body.price_cents,
    currency: body.currency || "CNY",
    interval: body.interval,
    provider_product_id: body.provider_product_id?.trim() || null,
    sort_order: body.sort_order ?? 0,
    enabled: body.enabled ?? true,
  };
}

export async function listMemberPlans(
  tenantId: string,
): Promise<MemberPlanDetail[]> {
  const rows = await prisma.memberPlan.findMany({
    where: withTenantScope(tenantId, {}),
    orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
  });
  return rows.map(toMemberPlanDetail);
}

export async function createMemberPlan(input: {
  tenant_id: string;
  body: MemberPlanWriteBody;
}): Promise<MemberPlanDetail> {
  assertWritable(input.body);

  const existing = await prisma.memberPlan.findFirst({
    where: withTenantScope(input.tenant_id, { slug: input.body.slug }),
    select: { id: true },
  });
  if (existing) {
    throw new ValidationError("site_billing.plan_slug_taken", {
      slug: input.body.slug,
    });
  }

  const row = await prisma.memberPlan.create({
    data: { tenant_id: input.tenant_id, ...planData(input.body) },
  });
  return toMemberPlanDetail(row);
}

export async function updateMemberPlan(input: {
  tenant_id: string;
  plan_id: string;
  body: MemberPlanWriteBody;
}): Promise<MemberPlanDetail> {
  assertWritable(input.body);

  const current = await prisma.memberPlan.findFirst({
    where: withTenantScope(input.tenant_id, { id: input.plan_id }),
    select: { id: true },
  });
  if (!current) throw new NotFoundError("site_billing.plan_not_found");

  const clash = await prisma.memberPlan.findFirst({
    where: withTenantScope(input.tenant_id, {
      slug: input.body.slug,
      id: { not: input.plan_id },
    }),
    select: { id: true },
  });
  if (clash) {
    throw new ValidationError("site_billing.plan_slug_taken", {
      slug: input.body.slug,
    });
  }

  const row = await prisma.memberPlan.update({
    where: withTenantScope(input.tenant_id, { id: input.plan_id }),
    data: planData(input.body),
  });
  return toMemberPlanDetail(row);
}

/**
 * 删一档。
 *
 * 还有人在订就不给删：历史订阅靠 `plan_slug` 说明买的是什么，但**在订的**那些
 * 一旦没了对应档位，续期与取消都会指向一个不存在的东西。让运营先停售（`enabled=false`）
 * ——停售之后新访客看不到它，老会员的订阅照常走完。
 */
export async function deleteMemberPlan(input: {
  tenant_id: string;
  plan_id: string;
}): Promise<void> {
  const plan = await prisma.memberPlan.findFirst({
    where: withTenantScope(input.tenant_id, { id: input.plan_id }),
    select: { id: true, slug: true },
  });
  if (!plan) throw new NotFoundError("site_billing.plan_not_found");

  const inUse = await prisma.memberSubscription.count({
    where: withTenantScope(input.tenant_id, {
      plan_slug: plan.slug,
      status: { in: ["active", "trialing", "past_due"] },
    }),
  });
  if (inUse > 0) {
    throw new ValidationError("site_billing.plan_in_use", { count: inUse });
  }

  await prisma.memberPlan.delete({
    where: withTenantScope(input.tenant_id, { id: input.plan_id }),
  });
}

/** 会员邮箱补进列表：运营看「谁订了」，只给 member_id 等于没说。 */
async function withMemberEmails<T extends { member_id: string }>(
  tenantId: string,
  items: T[],
): Promise<Array<T & { member_email: string | null }>> {
  const ids = [...new Set(items.map((item) => item.member_id))];
  if (ids.length === 0) return [];

  const members = await prisma.siteMember.findMany({
    where: withTenantScope(tenantId, { id: { in: ids } }),
    select: { id: true, email: true },
  });
  const emails = new Map(members.map((m) => [m.id, m.email]));
  return items.map((item) => ({
    ...item,
    member_email: emails.get(item.member_id) ?? null,
  }));
}

export async function listMemberSubscriptions(params: {
  tenant_id: string;
  page: number;
  page_size: number;
  status?: string;
  plan_slug?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}): Promise<SiteBillingListResult<MemberSubscriptionSummary>> {
  const field = resolveSortField(
    params.sort_by,
    SUBSCRIPTION_SORTABLE,
    "updated_at",
  );
  const order = resolveSortOrder(params.sort_dir, "desc");
  const where = withTenantScope(params.tenant_id, {
    ...(params.status ? { status: params.status } : {}),
    ...(params.plan_slug ? { plan_slug: params.plan_slug } : {}),
  });

  const [rows, total] = await Promise.all([
    prisma.memberSubscription.findMany({
      where,
      orderBy: { [field]: order },
      skip: (params.page - 1) * params.page_size,
      take: params.page_size,
    }),
    prisma.memberSubscription.count({ where }),
  ]);

  return {
    items: await withMemberEmails(
      params.tenant_id,
      rows.map(toMemberSubscription),
    ),
    page: params.page,
    page_size: params.page_size,
    total,
    page_count: Math.ceil(total / params.page_size),
  };
}

export async function listMemberPayments(params: {
  tenant_id: string;
  page: number;
  page_size: number;
  status?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}): Promise<SiteBillingListResult<MemberPaymentSummary>> {
  const field = resolveSortField(params.sort_by, PAYMENT_SORTABLE, "created_at");
  const order = resolveSortOrder(params.sort_dir, "desc");
  const where = withTenantScope(params.tenant_id, {
    ...(params.status ? { status: params.status } : {}),
  });

  const [rows, total] = await Promise.all([
    prisma.memberPayment.findMany({
      where,
      orderBy: { [field]: order },
      skip: (params.page - 1) * params.page_size,
      take: params.page_size,
    }),
    prisma.memberPayment.count({ where }),
  ]);

  return {
    items: await withMemberEmails(params.tenant_id, rows.map(toMemberPayment)),
    page: params.page,
    page_size: params.page_size,
    total,
    page_count: Math.ceil(total / params.page_size),
  };
}

import {
  isMemberPlanInterval,
  localizedTextFor,
  parseLocalizedText,
  type MemberPaymentStatus,
  type MemberPaymentSummary,
  type MemberPlanDetail,
  type MemberPlanInterval,
  type MemberPlanSummary,
  type MemberSubscriptionStatus,
  type MemberSubscriptionSummary,
} from "../shared/site-billing.js";

import type {
  MemberPayment,
  MemberPlan,
  MemberSubscription,
} from "@be-water/server-kernel/generated/prisma/client/client.js";
import type { AppLocale } from "@be-water/shared";

/** 库里的脏值不该炸掉整张列表：认不出的 interval 按最常见的「按月」算。 */
function planInterval(raw: string): MemberPlanInterval {
  return isMemberPlanInterval(raw) ? raw : "month";
}

/** 公开面 / 会员面看到的一档：文案已按站点语言压平。 */
export function toMemberPlanSummary(
  row: MemberPlan,
  locale: AppLocale,
  fallbackLocale: AppLocale,
): MemberPlanSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: localizedTextFor(row.name, locale, fallbackLocale),
    description: localizedTextFor(row.description, locale, fallbackLocale),
    price_cents: row.price_cents,
    currency: row.currency,
    interval: planInterval(row.interval),
    // 没配通道商品就买不了——公开面据此决定这一档出不出
    purchasable: Boolean(row.provider_product_id?.trim()),
    sort_order: row.sort_order,
    enabled: row.enabled,
  };
}

/** 管理面看到的一档：保留整张多语言表，编辑器要逐语言填。 */
export function toMemberPlanDetail(row: MemberPlan): MemberPlanDetail {
  return {
    id: row.id,
    slug: row.slug,
    name: parseLocalizedText(row.name),
    description: parseLocalizedText(row.description),
    price_cents: row.price_cents,
    currency: row.currency,
    interval: planInterval(row.interval),
    purchasable: Boolean(row.provider_product_id?.trim()),
    sort_order: row.sort_order,
    enabled: row.enabled,
    provider_product_id: row.provider_product_id,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export function toMemberSubscription(
  row: MemberSubscription,
): MemberSubscriptionSummary {
  return {
    id: row.id,
    member_id: row.member_id,
    plan_slug: row.plan_slug,
    status: row.status as MemberSubscriptionStatus,
    current_period_start: row.current_period_start?.toISOString() ?? null,
    current_period_end: row.current_period_end?.toISOString() ?? null,
    cancel_at_period_end: row.cancel_at_period_end,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export function toMemberPayment(row: MemberPayment): MemberPaymentSummary {
  return {
    id: row.id,
    member_id: row.member_id,
    plan_slug: row.plan_slug,
    amount_cents: row.amount_cents,
    currency: row.currency,
    status: row.status as MemberPaymentStatus,
    paid_at: row.paid_at?.toISOString() ?? null,
    description: row.description,
    created_at: row.created_at.toISOString(),
  };
}

import {
  isLocalizedText,
  resolveLocalizedText,
  type LocalizedText,
} from "../../marketing/shared/section-settings.js";

import type { AppLocale } from "@be-water/shared";

export const SITE_BILLING_PROVIDER_CREEM = "creem" as const;

/**
 * 计费周期。
 *
 * `onetime` 是买断（一次付清、不续期）——站点卖单篇内容、卖一次性会籍都用它。
 * 它没有「周期末取消」可言，取消按钮在那一档上不出现。
 */
export const MEMBER_PLAN_INTERVALS = ["month", "year", "onetime"] as const;
export type MemberPlanInterval = (typeof MEMBER_PLAN_INTERVALS)[number];

export function isMemberPlanInterval(
  value: unknown,
): value is MemberPlanInterval {
  return (MEMBER_PLAN_INTERVALS as readonly unknown[]).includes(value);
}

/** 与 billing 的状态集一致：同一套通道、同一批 webhook 事件。 */
export const MEMBER_SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
  "unpaid",
  "paused",
] as const;
export type MemberSubscriptionStatus =
  (typeof MEMBER_SUBSCRIPTION_STATUSES)[number];

export const MEMBER_PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
] as const;
export type MemberPaymentStatus = (typeof MEMBER_PAYMENT_STATUSES)[number];

/** 会员仍享有权益的状态；`past_due` 是宽限期，先别断人家的服务。 */
export const MEMBER_ACTIVE_STATUSES: MemberSubscriptionStatus[] = [
  "active",
  "trialing",
  "past_due",
];

export interface MemberPlanSummary {
  id: string;
  slug: string;
  /** 已按当前语言压平；管理端要整张表的走 `MemberPlanDetail`。 */
  name: string;
  description: string;
  price_cents: number;
  currency: string;
  interval: MemberPlanInterval;
  /** 通道商品配好了才买得到——没配时公开面上不出这一档。 */
  purchasable: boolean;
  sort_order: number;
  enabled: boolean;
}

/** 管理端要能逐语言编辑，所以保留整张多语言表。 */
export interface MemberPlanDetail
  extends Omit<MemberPlanSummary, "name" | "description"> {
  name: LocalizedText;
  description: LocalizedText;
  provider_product_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberPlanWriteBody {
  slug: string;
  name: LocalizedText;
  description?: LocalizedText;
  price_cents: number;
  currency: string;
  interval: MemberPlanInterval;
  provider_product_id?: string | null;
  sort_order?: number;
  enabled?: boolean;
}

export interface MemberSubscriptionSummary {
  id: string;
  member_id: string;
  /** 管理端列表用；公开面上会员看的是自己那条，不需要这一栏。 */
  member_email?: string | null;
  plan_slug: string;
  plan_name?: string;
  status: MemberSubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemberPaymentSummary {
  id: string;
  member_id: string;
  member_email?: string | null;
  plan_slug: string | null;
  amount_cents: number;
  currency: string;
  status: MemberPaymentStatus;
  paid_at: string | null;
  description: string | null;
  created_at: string;
}

export interface SiteBillingListResult<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

/**
 * 收款通道的配置状态 —— **永不返回密钥本身**，只说「配没配、用的是谁的」。
 *
 * `source` 要露出来：站长得看得见这笔钱最终进的是自己的账号还是平台默认账号。
 */
export interface SiteBillingProviderStatus {
  configured: boolean;
  source: "platform" | "tenant";
  /** 已配置时给个尾部片段，便于确认填的是哪一把 key。 */
  api_key_hint: string | null;
  webhook_secret_set: boolean;
  webhook_url: string;
}

export interface SiteBillingProviderBody {
  api_key?: string;
  webhook_secret?: string;
}

/** 多语言字段的读路径：脏数据不该炸掉整张列表。 */
export function parseLocalizedText(value: unknown): LocalizedText {
  if (isLocalizedText(value)) return value;
  if (typeof value === "string") return { __i18n: { "zh-CN": value } };
  return { __i18n: {} };
}

export function localizedTextFor(
  value: unknown,
  locale: AppLocale,
  fallbackLocale: AppLocale,
): string {
  return resolveLocalizedText(parseLocalizedText(value), locale, fallbackLocale);
}

/** 金额分 → 展示串（`¥` 之类的符号由调用方按 currency 决定）。 */
export function formatMemberPrice(
  amountCents: number,
  currency: string,
  locale: AppLocale,
): string {
  try {
    return new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-CN", {
      style: "currency",
      currency: currency || "CNY",
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency}`;
  }
}

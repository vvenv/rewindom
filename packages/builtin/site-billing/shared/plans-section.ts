/**
 * 「会员套餐」段 —— 访客在官网上挑一档、点一下就去结账。
 *
 * 与 billing 的 `billing.plans` 是两回事：那一段卖的是**平台套餐**（访客开一个组织），
 * 数据来自代码里的 `PRICING_PLANS`；这一段卖的是**站点自己的会员套餐**，数据是租户
 * 在 `/app/site-billing` 里建的 `MemberPlan` 行，钱也收进站点自己的通道账号。
 *
 * 段的 settings 里**没有价格**：价格在 `MemberPlan` 上。官网写一个数、结账收另一个数
 * 是这类页面最容易出的事故，把它从可配置项里去掉就不会发生。
 */

import {
  headingSettings,
  layoutSettings,
} from "../../marketing/shared/sections/_common/settings.js";


import type {
  MemberPlanInterval,
  MemberPlanSummary,
  MemberSubscriptionSummary,
} from "./site-billing.js";
import type { SectionDefinition } from "../../marketing/shared/section-schema.js";
import type { SectionRenderContext } from "../../marketing/shared/sections/render-context.js";

export const MEMBER_PLANS_SECTION_TYPE = "site-billing.plans";

/** 会员结账与取消都 POST 到这里，靠 `intent` 分流（同会员账户页那三张表单）。 */
export const MEMBER_BILLING_PATH = "/member/billing";

export type MemberBillingIntent = "checkout" | "cancel";

export function parseMemberBillingIntent(
  value: unknown,
): MemberBillingIntent | null {
  return value === "checkout" || value === "cancel" ? value : null;
}

/**
 * 两个段共用的按请求数据（走 `SectionRenderContext.contributed["site-billing"]`）。
 *
 * 「这个站有哪几档、这位访客登没登录、他现在订的是哪一档、上次提交错在哪」都是按
 * 请求变的，塞不进段的 settings；marketing 也不该认识这些字段——它只负责原样透传。
 */
export interface SiteBillingRenderContext {
  /** 已按站点语言压平、已按 `enabled` + 商品配置过滤的可售套餐。 */
  plans: MemberPlanSummary[];
  /** 会员当前的订阅；未登录或没买过都是 null。 */
  subscription: MemberSubscriptionSummary | null;
  /**
   * 当前订阅那一档的计费周期。
   *
   * 单拎出来是因为套餐可能已经下架——那时 `plans` 里查不到它，但订阅还在跑，
   * 而「要不要出取消按钮」正好取决于它是不是买断档。
   */
  subscription_interval: MemberPlanInterval | null;
  /** 表单 action（就是 `/member/billing`）。 */
  action: string;
  /** 未登录时按钮指向登录页（带 redirect 回来）。 */
  login_href: string;
  signed_in: boolean;
  /** 上一次提交的结果，服务端已按站点语言翻好的整句。 */
  error: string | null;
  notice: string | null;
  /** 已按站点语言格式化好的价格串，key 是 plan id——渲染器不做数字格式化。 */
  price_labels: Record<string, string>;
  /** 周期文案（「/月」「/年」「一次性」），同样按站点语言翻好。 */
  interval_labels: Record<string, string>;
  /** 「我的订阅」面板上那几行的标签与值，整句翻好。 */
  account_rows: Array<{ label: string; value: string }>;
  /** 付款记录（会员看自己的那几笔）。 */
  payments: Array<{ time: string; plan: string; amount: string; status: string }>;
}

const CONTEXT_KEY = "site-billing";

/** 收口断言：贡献方自己读自己的那一格，别让每个渲染器各写一遍 `as`。 */
export function readSiteBillingContext(
  ctx: SectionRenderContext,
): SiteBillingRenderContext | null {
  const value = ctx.contributed?.[CONTEXT_KEY];
  return value ? (value as SiteBillingRenderContext) : null;
}

/** 渲染侧塞进去时也走这里，key 只有一处写死。 */
export function siteBillingContextEntry(
  context: SiteBillingRenderContext,
): Record<string, unknown> {
  return { [CONTEXT_KEY]: context };
}

export const memberPlansSection: SectionDefinition = {
  type: MEMBER_PLANS_SECTION_TYPE,
  label: "site-billing:section.plans.label",
  placements: ["page"],
  settings: [
    ...headingSettings(),
    { type: "header", content: "site-billing:section.plans.display" },
    {
      type: "checkbox",
      id: "show_description",
      label: "site-billing:section.plans.showDescription",
      default: true,
    },
    {
      type: "text",
      id: "cta_label",
      label: "site-billing:section.plans.ctaLabel",
      default: "Subscribe",
      required: true,
    },
    {
      type: "text",
      id: "current_label",
      label: "site-billing:section.plans.currentLabel",
      default: "Your current plan",
      info: "site-billing:section.plans.currentLabelInfo",
    },
    {
      type: "text",
      id: "empty_text",
      label: "site-billing:section.plans.emptyText",
      default: "",
      info: "site-billing:section.plans.emptyTextInfo",
    },
    ...layoutSettings({ padding_top: 48, padding_bottom: 48 }),
  ],
};

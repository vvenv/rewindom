/**
 * 「我的订阅与付款」段 —— 会员自己那一份账单。
 *
 * 钉在 `member_billing` 模板页上（`page_kinds`）：它读的是当前会员的订阅，摆到官网
 * 某张普通页面中间要么什么都渲染不出，要么在公开页上露出别人的账单入口。
 *
 * 外壳与登录 / 账户同一套（`memberCardSettings` + `memberPageLayoutSettings`）：访客
 * 从账户菜单点进来，不该突然掉进一张无边宽页。真 `<form method="post">`，取消订阅
 * 不依赖 JS。
 */

import { headingSettings } from "../../marketing/shared/sections/_common/settings.js";
import {
  memberCardSettings,
  memberPageLayoutSettings,
} from "../../site-member/shared/member-page-settings.js";

import { SITE_BILLING_ENTITLEMENT } from "./entitlements.js";

import type { SectionDefinition } from "../../marketing/shared/section-schema.js";

export const MEMBER_BILLING_ACCOUNT_SECTION_TYPE = "site-billing.account";
export const MEMBER_BILLING_PAGE_KIND = "member_billing";

export const memberBillingAccountSection: SectionDefinition = {
  type: MEMBER_BILLING_ACCOUNT_SECTION_TYPE,
  label: "site-billing:section.account.label",
  placements: ["page"],
  page_kinds: [MEMBER_BILLING_PAGE_KIND],
  entitlement: SITE_BILLING_ENTITLEMENT.key,
  settings: [
    ...headingSettings(),
    { type: "header", content: "site-billing:section.account.subscription" },
    {
      type: "text",
      id: "none_text",
      label: "site-billing:section.account.noneText",
      default: "site-billing:account.none",
      required: true,
    },
    {
      type: "text",
      id: "cancel_label",
      label: "site-billing:section.account.cancelLabel",
      default: "site-billing:account.cancel",
      required: true,
    },
    {
      type: "text",
      id: "cancel_hint",
      label: "site-billing:section.account.cancelHint",
      default: "site-billing:account.cancelHint",
      info: "site-billing:section.account.cancelHintInfo",
    },
    { type: "header", content: "site-billing:section.account.payments" },
    {
      type: "checkbox",
      id: "show_payments",
      label: "site-billing:section.account.showPayments",
      default: true,
    },
    {
      type: "text",
      id: "payments_title",
      label: "site-billing:section.account.paymentsTitle",
      default: "site-billing:account.paymentsTitle",
    },
    {
      type: "text",
      id: "payments_empty",
      label: "site-billing:section.account.paymentsEmpty",
      default: "site-billing:account.paymentsEmpty",
    },
    ...memberCardSettings(),
    ...memberPageLayoutSettings(),
  ],
};

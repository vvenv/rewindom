/**
 * 「我的订阅与付款」模板页（`/member/billing`）的登记与兜底版式。
 *
 * 与会员的三张页面同一套机制：kind 唯一、slug 固定、默认不落库——租户没自定义过时
 * SSR 按这里的预设渲染，自定义之后就是一张普通页面记录，走同一个编辑器与发布流程。
 *
 * 中台分组复用 `MEMBER_PAGE_TEMPLATE_GROUP`（site-member 持有文案）：订阅页是
 * `/member/*` 家族的一员，不应再开一组「碰巧同名」的标题。
 *
 * 元数据在**两端**都要登记（写路径要按 kind 校验 slug，中台要列出这一行），
 * 所以由 `registerSiteBillingPageTemplates()` 统一暴露，server 的 `onBoot` 与
 * client manifest 各调一次；重复登记是幂等的。
 */

import {
  registerPageTemplateKind,
  registerPageTemplatePreset,
} from "../../marketing/shared/page-templates.js";
import { MEMBER_PAGE_TEMPLATE_GROUP } from "../../site-member/shared/member-page-templates.js";

import {
  MEMBER_BILLING_ACCOUNT_SECTION_TYPE,
  MEMBER_BILLING_PAGE_KIND,
} from "./account-section.js";
import { SITE_BILLING_ENTITLEMENT } from "./entitlements.js";
import { MEMBER_BILLING_PATH } from "./plans-section.js";

import type { PagePreset } from "../../marketing/shared/page-presets.types.js";

/** 固定 slug：kind 决定地址，租户改不了（改了会员就找不到自己的账单了）。 */
export const MEMBER_BILLING_TEMPLATE_SLUG = "member-billing";

export const MEMBER_BILLING_TEMPLATE_PRESET: PagePreset = {
  key: MEMBER_BILLING_PAGE_KIND,
  label: "site-billing:template.billing.label",
  kind: MEMBER_BILLING_PAGE_KIND,
  slug: MEMBER_BILLING_TEMPLATE_SLUG,
  titleKey: "site-billing:account.title",
  descriptionKey: "site-billing:account.subtitle",
  sections: [
    {
      type: MEMBER_BILLING_ACCOUNT_SECTION_TYPE,
      text: {
        heading: "site-billing:account.title",
        subheading: "site-billing:account.subtitle",
        none_text: "site-billing:account.none",
        cancel_label: "site-billing:account.cancel",
        cancel_hint: "site-billing:account.cancelHint",
        payments_title: "site-billing:account.paymentsTitle",
        payments_empty: "site-billing:account.paymentsEmpty",
      },
    },
  ],
};

export function registerSiteBillingPageTemplates(): void {
  registerPageTemplateKind({
    kind: MEMBER_BILLING_PAGE_KIND,
    slug: MEMBER_BILLING_TEMPLATE_SLUG,
    path: MEMBER_BILLING_PATH,
    group: MEMBER_PAGE_TEMPLATE_GROUP,
    label: "site-billing:template.billing.label",
    required_section: MEMBER_BILLING_ACCOUNT_SECTION_TYPE,
    entitlement: SITE_BILLING_ENTITLEMENT.key,
  });
  registerPageTemplatePreset(
    MEMBER_BILLING_PAGE_KIND,
    MEMBER_BILLING_TEMPLATE_PRESET,
  );
}

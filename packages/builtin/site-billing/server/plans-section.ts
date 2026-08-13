/**
 * 「会员套餐」段的 SSR 渲染。
 *
 * 每张卡是一个真 `<form method="post" action="/member/billing">` —— **没有 JS 也能
 * 下单**，同会员登录表单的理由：付费是入口性动作，不该押在一个可能加载失败的 bundle 上。
 *
 * 未登录时不出表单，出一条去登录页的链接（带 redirect 回来）。让访客点了才发现要
 * 登录、登录完又回到首页，是这类页面最常见的流失点。
 */

import { escapeHtml } from "../../marketing/shared/html.js";
import { settingBool, settingText } from "../../marketing/shared/section-schema.js";
import { sectionHeading } from "../../marketing/shared/sections/_common/html.js";
import {
  registerSiteSectionHtml,
  type SectionHtmlRenderer,
} from "../../marketing/shared/sections/html.js";
import {
  MEMBER_BILLING_PATH,
  memberPlansSection,
  readSiteBillingContext,
  type SiteBillingRenderContext,
} from "../shared/plans-section.js";
import { SITE_BILLING_CSS } from "../shared/site-css.generated.js";

import type { SettingValues } from "../../marketing/shared/section-settings.js";
import type { MemberPlanSummary } from "../shared/site-billing.js";
import type { AppLocale } from "@rewindom/shared";

/** 当前套餐旁的管理入口；与页头菜单同一去处。 */
const MANAGE_LABEL: Record<AppLocale, string> = {
  "zh-CN": "管理订阅",
  en: "Manage",
};

/** 提交结果条：与会员账户页的提示同一副长相。 */
export function alertHtml(ctx: SiteBillingRenderContext): string {
  if (ctx.error) {
    return `<p class="mbill-alert error">${escapeHtml(ctx.error)}</p>`;
  }
  if (ctx.notice) {
    return `<p class="mbill-alert notice">${escapeHtml(ctx.notice)}</p>`;
  }
  return "";
}

function planCardHtml(
  plan: MemberPlanSummary,
  s: SettingValues,
  ctx: SiteBillingRenderContext,
  manageLabel: string,
): string {
  const isCurrent = ctx.subscription?.plan_slug === plan.slug;
  const price = ctx.price_labels[plan.id] ?? "";
  const unit = ctx.interval_labels[plan.interval] ?? "";
  const description = settingBool(s, "show_description") ? plan.description : "";

  /*
   * 当前这一档不出「订阅」按钮：它已经是用户在用的东西了，再放一个可点的按钮，
   * 点下去就是重复下一单。改成「管理订阅」链到账单页——取消、看付款记录都在那里。
   */
  const action = isCurrent
    ? `<p class="mplan-current">${escapeHtml(settingText(s, "current_label"))} <a class="mplan-manage" href="${escapeHtml(MEMBER_BILLING_PATH)}">${escapeHtml(manageLabel)}</a></p>`
    : ctx.signed_in
      ? `<form method="post" action="${escapeHtml(ctx.action)}">
      <input type="hidden" name="intent" value="checkout" />
      <input type="hidden" name="plan_slug" value="${escapeHtml(plan.slug)}" />
      <button class="btn btn-primary" type="submit">${escapeHtml(settingText(s, "cta_label"))}</button>
    </form>`
      : `<p><a class="btn btn-primary" href="${escapeHtml(ctx.login_href)}">${escapeHtml(settingText(s, "cta_label"))}</a></p>`;

  return `<div class="mplan-card${isCurrent ? " current" : ""}">
  <p class="mplan-name">${escapeHtml(plan.name)}</p>
  ${description ? `<p class="mplan-desc">${escapeHtml(description)}</p>` : ""}
  <p class="mplan-price">${escapeHtml(price)}${unit ? `<span class="unit">${escapeHtml(unit)}</span>` : ""}</p>
  ${action}
</div>`;
}

const renderMemberPlansHtml: SectionHtmlRenderer = (section, ctx) => {
  const context = readSiteBillingContext(ctx);
  // 没有按请求数据 = 这一段被摆在了拿不到会员上下文的地方，什么都不画
  if (!context) return "";

  const s = section.settings;
  if (context.plans.length === 0) {
    const empty = settingText(s, "empty_text");
    // 一档都没上架时：站长填了话就说那句话，没填就整段不出（别露出一块空壳）
    return empty
      ? `${sectionHeading(s)}<p class="mbill-hint">${escapeHtml(empty)}</p>`
      : "";
  }

  const locale = (ctx.locale ?? ctx.defaultLocale ?? "zh-CN") as AppLocale;
  const manageLabel = MANAGE_LABEL[locale] ?? MANAGE_LABEL["zh-CN"];
  const cards = context.plans
    .map((plan) => planCardHtml(plan, s, context, manageLabel))
    .join("");

  return `${sectionHeading(s)}${alertHtml(context)}<div class="mplan-grid">${cards}</div>`;
};

/** 在模块 `onBoot` 里调；顺手把定义也登记进 marketing 的段注册表。 */
export function registerMemberPlansSection(): void {
  registerSiteSectionHtml(memberPlansSection, renderMemberPlansHtml, {
    css: SITE_BILLING_CSS,
  });
}

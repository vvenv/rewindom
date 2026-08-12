/**
 * 「我的订阅与付款」段的 SSR 渲染。
 *
 * 取消订阅是真表单 POST，与会员账户页的三张表单同一条链路（POST-重定向-GET，
 * 刷新不会重放）。买断档（`onetime`）不出取消按钮：一次性付款没有「周期末取消」
 * 可言，摆一个点了会报错的按钮不如不摆。
 */

import { escapeHtml } from "../../marketing/shared/html.js";
import { settingBool, settingText } from "../../marketing/shared/section-schema.js";
import { sectionHeading } from "../../marketing/shared/sections/_common/html.js";
import {
  registerSiteSectionHtml,
  type SectionHtmlRenderer,
} from "../../marketing/shared/sections/html.js";
import {
  memberBillingAccountSection,
} from "../shared/account-section.js";
import { readSiteBillingContext, type SiteBillingRenderContext  } from "../shared/plans-section.js";
import { SITE_BILLING_CSS } from "../shared/site-css.generated.js";

import { alertHtml } from "./plans-section.js";

import type { SettingValues } from "../../marketing/shared/section-settings.js";

function paymentsHtml(s: SettingValues, ctx: SiteBillingRenderContext): string {
  if (!settingBool(s, "show_payments")) return "";

  const title = settingText(s, "payments_title");
  if (ctx.payments.length === 0) {
    return `<div class="mbill-payments">
  ${title ? `<h3>${escapeHtml(title)}</h3>` : ""}
  <p class="mbill-hint">${escapeHtml(settingText(s, "payments_empty"))}</p>
</div>`;
  }

  const rows = ctx.payments
    .map(
      (payment) =>
        `<tr><td>${escapeHtml(payment.time)}</td><td>${escapeHtml(payment.plan)}</td><td>${escapeHtml(payment.amount)}</td><td>${escapeHtml(payment.status)}</td></tr>`,
    )
    .join("");

  return `<div class="mbill-payments">
  ${title ? `<h3>${escapeHtml(title)}</h3>` : ""}
  <div class="table-wrap"><table><tbody>${rows}</tbody></table></div>
</div>`;
}

const renderMemberBillingAccountHtml: SectionHtmlRenderer = (section, ctx) => {
  const context = readSiteBillingContext(ctx);
  if (!context) return "";

  const s = section.settings;
  const subscription = context.subscription;

  if (!subscription) {
    return `${sectionHeading(s)}${alertHtml(context)}<div class="mbill-panel"><p>${escapeHtml(settingText(s, "none_text"))}</p></div>${paymentsHtml(s, context)}`;
  }

  const rows = context.account_rows
    .map(
      (row) =>
        `<div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`,
    )
    .join("");

  const hint = settingText(s, "cancel_hint");
  /*
   * 已经安排了周期末取消就不再出按钮：再点一次没有任何新含义，只会让人怀疑
   * 上一次到底成没成。
   */
  const canCancel =
    !subscription.cancel_at_period_end &&
    context.subscription_interval !== "onetime";

  const cancelForm = canCancel
    ? `<form method="post" action="${escapeHtml(context.action)}">
    <input type="hidden" name="intent" value="cancel" />
    <button class="btn btn-secondary" type="submit">${escapeHtml(settingText(s, "cancel_label"))}</button>
  </form>
  ${hint ? `<p class="mbill-hint">${escapeHtml(hint)}</p>` : ""}`
    : "";

  return `${sectionHeading(s)}${alertHtml(context)}<div class="mbill-panel">
  <dl>${rows}</dl>
  ${cancelForm}
</div>${paymentsHtml(s, context)}`;
};

export function registerMemberBillingAccountSection(): void {
  registerSiteSectionHtml(
    memberBillingAccountSection,
    renderMemberBillingAccountHtml,
    { css: SITE_BILLING_CSS },
  );
}

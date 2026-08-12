/**
 * 「套餐」段的 SSR 渲染。
 *
 * 价格与套餐名不进 section settings：数字来自 `PRICING_PLANS`，名字来自
 * `platform` 的 locale JSON（`planName(slug, locale)`）。租户排版、写卖点、改按钮
 * 文案，但改不出一个与结账页不符的价钱。
 *
 * 按语言取文案靠 `ctx.locale` —— 公开站的语言是**访客在看哪个语言版本**，
 * 不是工作台管理员的界面语言。
 */

import { escapeHtml } from "../../marketing/shared/html.js";
import {
  settingBool,
  settingLines,
  settingText,
} from "../../marketing/shared/section-schema.js";
import { linkAttrs, sectionHeading } from "../../marketing/shared/sections/_common/html.js";
import {
  registerSiteSectionHtml,
  type SectionHtmlRenderer,
} from "../../marketing/shared/sections/html.js";
import {
  planDescription,
  planName,
} from "../../platform/server/plan-i18n.js";
import { getPlanBySlug } from "../../platform/shared/pricing-plans.js";
import { billingPlansSection } from "../shared/plans-section.js";
import { BILLING_PLANS_CSS } from "../shared/site-css.generated.js";

import type { SettingValues } from "../../marketing/shared/section-settings.js";
import type { AppLocale } from "@be-water/shared";

/** 块上填了就用块的，否则回落段级——每张卡不必都填一遍同样的按钮文案。 */
function inherited(
  block: SettingValues,
  section: SettingValues,
  id: string,
): string {
  return settingText(block, id) || settingText(section, id);
}

function priceHtml(
  slug: string,
  section: SettingValues,
): string {
  const price = getPlanBySlug(slug)?.price_monthly;
  if (price == null) {
    // 议价档（enterprise）：写「联系我们」，不是写一个假数字
    return `<p class="plan-price">${escapeHtml(settingText(section, "custom_price_label"))}</p>`;
  }
  const prefix = escapeHtml(settingText(section, "price_prefix"));
  const suffix = escapeHtml(settingText(section, "price_suffix"));
  return `<p class="plan-price">${prefix}${price}${suffix ? `<span class="unit">${suffix}</span>` : ""}</p>`;
}

function planCardHtml(
  block: { id: string; settings: SettingValues },
  section: SettingValues,
  locale: AppLocale,
): string {
  const slug = settingText(block.settings, "plan_slug");
  if (!getPlanBySlug(slug)) return "";

  const badge = settingText(block.settings, "badge");
  const features = settingLines(block.settings, "features");
  const ctaLabel = inherited(block.settings, section, "primary_label");
  const ctaHref = inherited(block.settings, section, "primary_href");
  const showDescription = settingBool(section, "show_description");
  const description = showDescription ? planDescription(slug, locale) : "";

  return `<div class="plan-card${badge ? " featured" : ""}">
  ${badge ? `<span class="plan-badge">${escapeHtml(badge)}</span>` : ""}
  <p class="plan-name">${escapeHtml(planName(slug, locale))}</p>
  ${description ? `<p class="plan-desc">${escapeHtml(description)}</p>` : ""}
  ${priceHtml(slug, section)}
  ${
    features.length > 0
      ? `<ul class="plan-features">${features
          .map((line) => `<li>${escapeHtml(line)}</li>`)
          .join("")}</ul>`
      : ""
  }
  ${
    ctaLabel && ctaHref
      ? `<p class="plan-cta"><a class="btn btn-primary"${linkAttrs(ctaHref)}>${escapeHtml(ctaLabel)}</a></p>`
      : ""
  }
</div>`;
}

const renderBillingPlansHtml: SectionHtmlRenderer = (section, ctx) => {
  const locale: AppLocale = ctx.locale ?? "zh-CN";
  const cards = section.blocks
    .map((block) => planCardHtml(block, section.settings, locale))
    .filter(Boolean)
    .join("");
  // 一张卡都没有就整段不出：空的定价区比没有定价区更难看
  if (!cards) return "";

  return `${sectionHeading(section.settings)}<div class="plan-grid">${cards}</div>`;
};

/** 在模块 `onBoot` 里调；顺手把定义也登记进 marketing 的段注册表。 */
export function registerBillingPlansSection(): void {
  registerSiteSectionHtml(billingPlansSection, renderBillingPlansHtml, {
    css: BILLING_PLANS_CSS,
  });
}

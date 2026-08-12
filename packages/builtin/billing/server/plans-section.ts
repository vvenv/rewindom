/**
 * 「套餐」段的 SSR 渲染 + 它的数据提供者。
 *
 * 段渲染器是**同步**的，而套餐配置在库里（平台控制台可改）——所以数据由
 * `registerSectionContextProvider` 在渲染前备好，渲染器只负责把它画出来。
 * 页面上没摆这一段时 provider 不会被调用，一次查询都不发。
 *
 * 文案与价格都在 provider 里定稿：文案按**站点语言**取（访客在看哪个语言版本），
 * 价格交给 `Intl.NumberFormat` 按语言与币种自动成形——段里没有前后缀可配。
 */

import { registerSectionContextProvider, type SectionContextInput  } from "../../marketing/server/section-context-providers.js";
import { escapeHtml } from "../../marketing/shared/html.js";
import { settingBool, settingText } from "../../marketing/shared/section-schema.js";
import {
  linkAttrs,
  sectionHeading,
} from "../../marketing/shared/sections/_common/html.js";
import {
  registerSiteSectionHtml,
  type SectionHtmlRenderer,
} from "../../marketing/shared/sections/html.js";
import {
  planCustomPriceLabel,
  planDescription,
  planFeatures,
  planName,
} from "../../platform/server/plan-i18n.js";
import { getPlanCatalog } from "../../platform/server/services/plan-catalog.service.js";
import {
  formatPlanPrice,
  listedPlansOf, type ResolvedPlan 
} from "../../platform/shared/plan-pricing.js";
import {
  billingPlansContextEntry,
  billingPlansSection,
  BILLING_PLANS_SECTION_TYPE,
  readBillingPlansContext,
} from "../shared/plans-section.js";
import { BILLING_PLANS_CSS } from "../shared/site-css.generated.js";

import type { AppLocale } from "@be-water/shared";

/** 覆盖文案优先，空则回落内置文案（`platform` 的 locale JSON）——两者是同一套 key。 */
function textOf(
  override: Record<string, string>,
  locale: AppLocale,
  defaultLocale: AppLocale,
  fallback: () => string,
): string {
  return override[locale] || override[defaultLocale] || fallback();
}

function featuresOf(
  plan: ResolvedPlan,
  locale: AppLocale,
  defaultLocale: AppLocale,
): string[] {
  const override = plan.features[locale] ?? plan.features[defaultLocale];
  return override && override.length > 0
    ? override
    : planFeatures(plan.slug, locale);
}

async function providePlansContext(
  input: SectionContextInput,
): Promise<Record<string, unknown>> {
  const { locale, defaultLocale } = input;
  const plans = listedPlansOf(await getPlanCatalog()).map((plan) => ({
    slug: plan.slug,
    name: textOf(plan.name, locale, defaultLocale, () =>
      planName(plan.slug, locale),
    ),
    description: textOf(plan.description, locale, defaultLocale, () =>
      planDescription(plan.slug, locale),
    ),
    /*
     * 议价档不写数字，写那句「联系我们」——它随语言变，所以也在这里定稿，
     * 不做成段的设置项。
     */
    price:
      plan.price_cents == null
        ? planCustomPriceLabel(locale)
        : formatPlanPrice(plan.price_cents, plan.currency, locale),
    features: featuresOf(plan, locale, defaultLocale),
    highlighted: plan.highlighted,
  }));

  return billingPlansContextEntry({ plans });
}

function planCardHtml(
  plan: NonNullable<ReturnType<typeof readBillingPlansContext>>["plans"][number],
  s: Parameters<typeof settingText>[0],
): string {
  const description = settingBool(s, "show_description") ? plan.description : "";
  const features = settingBool(s, "show_features") ? plan.features : [];
  const ctaLabel = settingText(s, "cta_label");
  const ctaHref = settingText(s, "cta_href");

  return `<div class="plan-card${plan.highlighted ? " featured" : ""}">
  <p class="plan-name">${escapeHtml(plan.name)}</p>
  ${description ? `<p class="plan-desc">${escapeHtml(description)}</p>` : ""}
  <p class="plan-price">${escapeHtml(plan.price)}</p>
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
  const context = readBillingPlansContext(ctx);
  // 拿不到数据（provider 没跑或出错）就整段不出，别露出一块空壳
  if (!context || context.plans.length === 0) return "";

  const cards = context.plans
    .map((plan) => planCardHtml(plan, section.settings))
    .join("");

  return `${sectionHeading(section.settings)}<div class="plan-grid">${cards}</div>`;
};

/** 在模块 `onBoot` 里调；顺手把定义也登记进 marketing 的段注册表。 */
export function registerBillingPlansSection(): void {
  registerSiteSectionHtml(billingPlansSection, renderBillingPlansHtml, {
    css: BILLING_PLANS_CSS,
  });
  registerSectionContextProvider({
    sectionTypes: [BILLING_PLANS_SECTION_TYPE],
    provide: providePlansContext,
  });
}

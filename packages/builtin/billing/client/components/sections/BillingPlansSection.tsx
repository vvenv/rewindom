/**
 * 「套餐」段的编辑器预览 —— 与 `server/plans-section.ts` **同构**：同一份数据、
 * 同一套 class、同一个取值顺序。两边分开写不是设计取舍，是 bundle 的现实
 *（React 组件进不了 Fastify），所以改一边就该改另一边。
 *
 * 预览画的是**真实套餐**（平台控制台「套餐配置」里那几档），不是占位样张：
 * 这一段本来就没有可配的数据，编辑器要让人看到的正是访客会看见的东西——四档挤在
 * 一行里会不会太窄，只有真数据答得上来。
 */

import type { ReactElement } from "react";

import { useTranslation } from "react-i18next";

import {
  SectionHeading,
  type SectionViewProps,
} from "../../../../marketing/client/components/sections/section-parts.js";
import { useSiteLocale } from "../../../../marketing/client/components/sections/site-locale-context.js";
import { SiteLink } from "../../../../marketing/client/components/sections/SiteLink.js";
import {
  settingBool,
  settingText,
} from "../../../../marketing/shared/section-schema.js";
import { formatPlanPrice } from "../../../../platform/shared/plan-pricing.js";
import { usePublicPlans } from "../../hooks/usePublicPlans.js";

export function BillingPlansSection({
  section,
}: SectionViewProps): ReactElement | null {
  /*
   * 站点语言，不是工作台语言：预览里看到的应该是**访客**在这个语言版本上看到的
   * 东西。`lng` 强制到站点语言即可——所有语言的文案在 i18next 里都已注册。
   */
  const locale = useSiteLocale();
  const { t } = useTranslation(["platform"]);
  const plansQuery = usePublicPlans();

  const s = section.settings;
  const plans = plansQuery.data ?? [];
  if (plans.length === 0) return null;

  const showDescription = settingBool(s, "show_description");
  const showFeatures = settingBool(s, "show_features");
  const ctaLabel = settingText(s, "cta_label");
  const ctaHref = settingText(s, "cta_href");

  /** 覆盖文案优先，空则回落内置文案——与 SSR 侧 `textOf` 同一口径。 */
  const text = (
    override: Record<string, string>,
    slug: string,
    field: "name" | "description",
  ): string =>
    override[locale] ||
    t(`plans.${slug}.${field}`, {
      ns: "platform",
      lng: locale,
      defaultValue: field === "name" ? slug : "",
    });

  const featuresOf = (
    override: Record<string, string[]>,
    slug: string,
  ): string[] => {
    if (override[locale]?.length) return override[locale];
    const built = t(`plans.${slug}.features`, {
      ns: "platform",
      lng: locale,
      returnObjects: true,
      defaultValue: [],
    });
    return Array.isArray(built)
      ? built.filter((item): item is string => typeof item === "string")
      : [];
  };

  return (
    <>
      <SectionHeading settings={s} />
      <div className="plan-grid">
        {plans.map((plan) => {
          const description = showDescription
            ? text(plan.description, plan.slug, "description")
            : "";
          const lines = showFeatures ? featuresOf(plan.features, plan.slug) : [];

          return (
            <div
              key={plan.slug}
              className={`plan-card${plan.highlighted ? " featured" : ""}`}
            >
              <p className="plan-name">{text(plan.name, plan.slug, "name")}</p>
              {description ? <p className="plan-desc">{description}</p> : null}
              <p className="plan-price">
                {plan.price_cents == null
                  ? t("plans.customPrice", { ns: "platform", lng: locale })
                  : formatPlanPrice(plan.price_cents, plan.currency, locale)}
              </p>
              {lines.length > 0 ? (
                <ul className="plan-features">
                  {lines.map((line, index) => (
                    <li key={`${plan.slug}-${index}`}>{line}</li>
                  ))}
                </ul>
              ) : null}
              {ctaLabel && ctaHref ? (
                <p className="plan-cta">
                  <SiteLink href={ctaHref} className="btn btn-primary">
                    {ctaLabel}
                  </SiteLink>
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}

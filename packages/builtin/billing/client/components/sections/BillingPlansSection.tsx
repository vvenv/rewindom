/**
 * 「套餐」段的编辑器预览 —— 与 `server/plans-section.ts` **同构**：同一套 class、
 * 同一个取值顺序。两边分开写不是设计取舍，是 bundle 的现实（React 组件进不了
 * Fastify），所以改一边就该改另一边，diff 里它们是相邻的。
 */

import type { ReactElement } from "react";

import { useTranslation } from "react-i18next";

import { SectionHeading, type SectionViewProps } from "../../../../marketing/client/components/sections/section-parts.js";
import { useSiteLocale } from "../../../../marketing/client/components/sections/site-locale-context.js";
import { SiteLink } from "../../../../marketing/client/components/sections/SiteLink.js";
import {
  settingBool,
  settingLines,
  settingText,
} from "../../../../marketing/shared/section-schema.js";
import { getPlanBySlug } from "../../../../platform/shared/pricing-plans.js";


import type { SettingValues } from "../../../../marketing/shared/section-settings.js";
import type { AppLocale } from "@be-water/shared";


function inherited(
  block: SettingValues,
  section: SettingValues,
  id: string,
): string {
  return settingText(block, id) || settingText(section, id);
}

export function BillingPlansSection({
  section,
}: SectionViewProps): ReactElement | null {
  /*
   * 站点语言，不是工作台语言：预览里看到的应该是**访客**在这个语言版本上看到的
   * 东西。`lng` 强制到站点语言即可——所有语言的文案在 i18next 里都已注册。
   */
  const locale: AppLocale = useSiteLocale();
  const { t } = useTranslation(["platform"]);

  const s = section.settings;
  const showDescription = settingBool(s, "show_description");

  const cards = section.blocks
    .map((block) => ({ block, slug: settingText(block.settings, "plan_slug") }))
    .filter(({ slug }) => Boolean(getPlanBySlug(slug)));

  if (cards.length === 0) return null;

  const planText = (slug: string, field: "name" | "description"): string =>
    t(`plans.${slug}.${field}`, {
      ns: "platform",
      lng: locale,
      defaultValue: field === "name" ? slug : "",
    });

  return (
    <>
      <SectionHeading settings={s} />
      <div className="plan-grid">
        {cards.map(({ block, slug }) => {
          const badge = settingText(block.settings, "badge");
          const features = settingLines(block.settings, "features");
          const ctaLabel = inherited(block.settings, s, "primary_label");
          const ctaHref = inherited(block.settings, s, "primary_href");
          const price = getPlanBySlug(slug)?.price_monthly;
          const description = showDescription ? planText(slug, "description") : "";

          return (
            <div
              key={block.id}
              data-block-id={block.id}
              className={`plan-card${badge ? " featured" : ""}`}
            >
              {badge ? <span className="plan-badge">{badge}</span> : null}
              <p className="plan-name">{planText(slug, "name")}</p>
              {description ? <p className="plan-desc">{description}</p> : null}
              {price == null ? (
                <p className="plan-price">{settingText(s, "custom_price_label")}</p>
              ) : (
                <p className="plan-price">
                  {settingText(s, "price_prefix")}
                  {price}
                  {settingText(s, "price_suffix") ? (
                    <span className="unit">{settingText(s, "price_suffix")}</span>
                  ) : null}
                </p>
              )}
              {features.length > 0 ? (
                <ul className="plan-features">
                  {features.map((line, index) => (
                    <li key={`${block.id}-${index}`}>{line}</li>
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

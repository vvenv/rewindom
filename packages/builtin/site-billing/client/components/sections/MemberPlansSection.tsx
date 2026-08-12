/**
 * 「会员套餐」段的编辑器预览 —— 画的是**这个站真实的套餐**（`/app/site-billing` 里
 * 建的那几档），不是占位样张。
 *
 * 这一段没有任何可配的数据：档位、价格、说明全来自 `MemberPlan`。编辑器要让人看到的
 * 正是「摆上去之后访客会看见什么」，所以预览直接把数据拉过来——样张只能告诉你版式，
 * 告诉不了你「我那四档挤在一行里会不会太窄」。
 *
 * 结构与 `server/plans-section.ts` 同构（同一套 class、同一个取值顺序）。
 */

import type { ReactElement } from "react";

import { useTranslation } from "react-i18next";

import {
  SectionHeading,
  type SectionViewProps,
} from "../../../../marketing/client/components/sections/section-parts.js";
import { useSiteLocale } from "../../../../marketing/client/components/sections/site-locale-context.js";
import {
  settingBool,
  settingText,
} from "../../../../marketing/shared/section-schema.js";
import { readLocalizedSetting } from "../../../../marketing/shared/section-settings.js";
import { formatMemberPrice } from "../../../shared/site-billing.js";
import { useMemberPlans } from "../../hooks/useSiteBilling.js";

export function MemberPlansSection({
  section,
}: SectionViewProps): ReactElement | null {
  const { t } = useTranslation(["site-billing"]);
  const locale = useSiteLocale();
  const plansQuery = useMemberPlans();

  const s = section.settings;
  const showDescription = settingBool(s, "show_description");

  /*
   * 只画**能买到的**那几档，与公开面同一把尺子（`listPurchasablePlans`）：上架了但
   * 没配收款商品的档在官网上不会出现，预览里出现就是在骗人。
   */
  const plans = (plansQuery.data ?? []).filter(
    (plan) => plan.enabled && plan.purchasable,
  );

  if (plans.length === 0) {
    /*
     * 编辑器里**不能**跟公开面一样悄悄消失。
     *
     * 段是能加的（先排版后补数据是正常顺序），但加完看见一片空白，人只会以为段坏了
     * ——真正的原因是「这个站还没建套餐」。这条提示只活在编辑器里：section 视图只在
     * 主题编辑器渲染，公开面走 SSR，那边照旧整段不出。
     */
    if (plansQuery.isLoading) return null;
    return (
      <>
        <SectionHeading settings={s} />
        <p className="mbill-hint">
          {t("section.plans.unconfigured")}{" "}
          <a href="/app/site-billing">{t("section.plans.unconfiguredCta")}</a>
        </p>
      </>
    );
  }

  return (
    <>
      <SectionHeading settings={s} />
      <div className="mplan-grid">
        {plans.map((plan) => {
          const name =
            readLocalizedSetting(plan.name, locale, locale) ||
            Object.values(plan.name.__i18n).find(Boolean) ||
            plan.slug;
          const description = showDescription
            ? readLocalizedSetting(plan.description, locale, locale) ||
              Object.values(plan.description.__i18n).find(Boolean) ||
              ""
            : "";

          return (
            <div key={plan.id} className="mplan-card">
              <p className="mplan-name">{name}</p>
              {description ? <p className="mplan-desc">{description}</p> : null}
              <p className="mplan-price">
                {formatMemberPrice(plan.price_cents, plan.currency, locale)}
                <span className="unit">{t(`interval.${plan.interval}`)}</span>
              </p>
              <p>
                <span className="btn btn-primary">
                  {settingText(s, "cta_label")}
                </span>
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}

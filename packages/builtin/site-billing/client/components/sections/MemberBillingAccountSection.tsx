/**
 * 「我的订阅与付款」段的编辑器预览。
 *
 * 同 `MemberPlansSection`：真实数据只在 SSR 时才有，这里画的是结构一致的样张。
 * 站长在编辑器里要判断的是版式与文案，不是某位会员的账单。
 */

import type { ReactElement } from "react";

import { useTranslation } from "react-i18next";

import { SectionHeading, type SectionViewProps  } from "../../../../marketing/client/components/sections/section-parts.js";
import {
  settingBool,
  settingText,
} from "../../../../marketing/shared/section-schema.js";


export function MemberBillingAccountSection({
  section,
}: SectionViewProps): ReactElement {
  const { t } = useTranslation(["site-billing"]);
  const s = section.settings;
  const hint = settingText(s, "cancel_hint");

  const rows = [
    { label: t("account.planLabel"), value: t("section.plans.label") },
    { label: t("account.statusLabel"), value: t("status.active") },
    { label: t("account.periodEndLabel"), value: "—" },
    { label: t("account.cancelAtPeriodEndLabel"), value: t("account.no") },
  ];

  return (
    <>
      <SectionHeading settings={s} />
      <div className="mbill-panel">
        <dl>
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
        <p>
          <span className="btn btn-secondary">{settingText(s, "cancel_label")}</span>
        </p>
        {hint ? <p className="mbill-hint">{hint}</p> : null}
      </div>
      {settingBool(s, "show_payments") ? (
        <div className="mbill-payments">
          <h3>{settingText(s, "payments_title")}</h3>
          <p className="mbill-hint">{settingText(s, "payments_empty")}</p>
        </div>
      ) : null}
    </>
  );
}

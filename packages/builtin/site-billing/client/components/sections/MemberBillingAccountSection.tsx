/**
 * 「我的订阅与付款」段的编辑器预览。
 *
 * 同 `MemberPlansSection`：真实数据只在 SSR 时才有，这里画的是结构一致的样张。
 * 站长在编辑器里要判断的是版式与文案，不是某位会员的账单。
 *
 * 外壳与 SSR 同构：`member-auth-card`，不另起一层描边面板。
 */

import type { ReactElement } from "react";

import { useTranslation } from "react-i18next";

import type { SectionViewProps } from "../../../../marketing/client/components/sections/section-parts.js";
import {
  settingBool,
  settingText,
} from "../../../../marketing/shared/section-schema.js";
import { memberCardClass } from "../../../../site-member/shared/member-page-settings.js";

export function MemberBillingAccountSection({
  section,
}: SectionViewProps): ReactElement {
  const { t } = useTranslation(["site-billing"]);
  const s = section.settings;
  const heading = settingText(s, "heading");
  const subheading = settingText(s, "subheading");
  const hint = settingText(s, "cancel_hint");

  const rows = [
    { label: t("account.planLabel"), value: t("section.plans.label") },
    { label: t("account.statusLabel"), value: t("status.active") },
    { label: t("account.periodEndLabel"), value: "—" },
    { label: t("account.cancelAtPeriodEndLabel"), value: t("account.no") },
  ];

  return (
    <div className={memberCardClass(s, "member-billing-card")}>
      {heading || subheading ? (
        <div className="member-auth-head">
          {heading ? <h2>{heading}</h2> : null}
          {subheading ? <p>{subheading}</p> : null}
        </div>
      ) : null}
      <dl className="member-account-meta mbill-meta">
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="member-account-actions">
        <button className="btn btn-secondary" type="button" tabIndex={-1}>
          {settingText(s, "cancel_label")}
        </button>
      </div>
      {hint ? <p className="mbill-hint">{hint}</p> : null}
      {settingBool(s, "show_payments") ? (
        <div className="mbill-payments">
          <h3 className="member-account-block-title">
            {settingText(s, "payments_title")}
          </h3>
          <p className="mbill-hint">{settingText(s, "payments_empty")}</p>
        </div>
      ) : null}
    </div>
  );
}

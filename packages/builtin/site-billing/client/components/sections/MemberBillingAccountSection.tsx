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

import { useSiteLocale } from "../../../../marketing/client/components/sections/site-locale-context.js";
import {
  settingBool,
  settingText,
} from "../../../../marketing/shared/section-schema.js";
import {
  listMemberSiblingLinks,
  memberMenuLinkLabel,
} from "../../../../site-member/shared/member-menu-links.js";
import { memberCardClass } from "../../../../site-member/shared/member-page-settings.js";
import { MEMBER_BILLING_PATH } from "../../../shared/plans-section.js";

import type { SectionViewProps } from "../../../../marketing/client/components/sections/section-parts.js";

export function MemberBillingAccountSection({
  section,
}: SectionViewProps): ReactElement {
  const { t, i18n } = useTranslation(["site-billing", "site-member"]);
  /*
   * 站点语言，不是工作台语言：样张里的字段名与入口名，会员在这个语言版本上
   * 看到的是哪一份，编辑器就该显示哪一份（SSR 侧取的是 `ctx.locale`）。
   */
  const locale = useSiteLocale();
  const s = section.settings;
  const heading = settingText(s, "heading");
  const subheading = settingText(s, "subheading");
  const hint = settingText(s, "cancel_hint");
  const siblingLinks = listMemberSiblingLinks({
    excludeHref: MEMBER_BILLING_PATH,
  });

  const lng = { lng: locale };
  const rows = [
    { label: t("account.planLabel", lng), value: t("section.plans.label", lng) },
    { label: t("account.statusLabel", lng), value: t("status.active", lng) },
    { label: t("account.periodEndLabel", lng), value: "—" },
    {
      label: t("account.cancelAtPeriodEndLabel", lng),
      value: t("account.no", lng),
    },
  ];

  return (
    <div className={memberCardClass(s, "member-billing-card")}>
      {heading || subheading ? (
        <div className="member-auth-head">
          {heading ? <h2>{heading}</h2> : null}
          {subheading ? <p>{subheading}</p> : null}
        </div>
      ) : null}
      {siblingLinks.length > 0 ? (
        <nav
          className="member-account-links"
          aria-label={t("site-member:entry.links", lng)}
        >
          {siblingLinks.map((link) => (
            <a key={link.id} href={link.href}>
              {link.label_key
                ? i18n.t(link.label_key, lng)
                : memberMenuLinkLabel(link, locale)}
            </a>
          ))}
        </nav>
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

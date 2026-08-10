import type { ReactElement, ReactNode } from "react";

import { useTranslation } from "react-i18next";

import {
  settingBool,
  settingText,
} from "../../../marketing/shared/section-schema.js";
import { memberCardClass } from "../../shared/member-page-settings.js";

import type { SectionViewProps } from "../../../marketing/client/components/sections/section-parts.js";

/** 资料 / 改密码各自一块，与 SSR 的 `blockHtml` 同构。 */
function AccountBlock({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section className="member-account-block">
      {title || desc ? (
        <div className="member-account-block-head">
          {title ? (
            <h3 className="member-account-block-title">{title}</h3>
          ) : null}
          {desc ? <p className="member-account-block-desc">{desc}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/**
 * 「我的账户」面板段的**编辑器预览**。
 *
 * 结构与 SSR 的 `renderAccountPanelHtml` 同构（`MemberAccountPanelSection.test.tsx`
 * 守着），差别只有两处，都是刻意的：
 *
 * - **谁的账户**是按请求才知道的，预览里填一份一眼看得出是样例的数据。填站长自己的
 *   邮箱更糟——那会让人以为编辑器改的是自己那条记录。
 * - 表单不接提交：这是版式预览，不是第二个能改密码的地方。
 */
function AccountPanelPreview({ section }: SectionViewProps): ReactElement {
  const { t } = useTranslation("site-member");
  const s = section.settings;
  const heading = settingText(s, "heading");
  const subheading = settingText(s, "subheading");
  const emailNote = settingText(s, "email_note");

  const field = (
    id: string,
    label: string,
    type: string,
    value?: string,
    note?: string,
  ): ReactElement => (
    <div key={id} className="member-auth-field">
      <label htmlFor={`preview-${id}`}>{label}</label>
      <input
        id={`preview-${id}`}
        type={type}
        defaultValue={value}
        readOnly
        tabIndex={-1}
      />
      {note ? <p className="member-account-note">{note}</p> : null}
    </div>
  );

  return (
    <div className={memberCardClass(s, "member-account-card")}>
      {heading || subheading ? (
        <div className="member-auth-head">
          {heading ? <h2>{heading}</h2> : null}
          {subheading ? <p>{subheading}</p> : null}
        </div>
      ) : null}
      <AccountBlock
        title={settingText(s, "profile_title")}
        desc={settingText(s, "profile_desc")}
      >
        <form
          className="member-auth"
          data-member-account="profile"
          onSubmit={(event) => event.preventDefault()}
        >
          {field(
            "account-email",
            settingText(s, "email_label"),
            "email",
            t("editor.accountSample.email"),
            emailNote,
          )}
          {field(
            "account-name",
            settingText(s, "display_name_label"),
            "text",
            t("editor.accountSample.displayName"),
          )}
          {settingBool(s, "show_meta") ? (
            <dl className="member-account-meta">
              <dt>{settingText(s, "created_label")}</dt>
              <dd>{t("editor.accountSample.date")}</dd>
              <dt>{settingText(s, "last_login_label")}</dt>
              <dd>{t("editor.accountSample.date")}</dd>
            </dl>
          ) : null}
          <button className="btn member-auth-submit" type="button" tabIndex={-1}>
            {settingText(s, "save_label")}
          </button>
        </form>
      </AccountBlock>
      {settingBool(s, "show_password") ? (
        <AccountBlock
          title={settingText(s, "password_divider")}
          desc={settingText(s, "password_desc")}
        >
          <form
            className="member-auth"
            data-member-account="password"
            onSubmit={(event) => event.preventDefault()}
          >
            {field(
              "old-password",
              settingText(s, "old_password_label"),
              "password",
            )}
            {field(
              "new-password",
              settingText(s, "new_password_label"),
              "password",
            )}
            {field(
              "confirm-password",
              settingText(s, "confirm_password_label"),
              "password",
            )}
            <button
              className="btn member-auth-submit"
              type="button"
              tabIndex={-1}
            >
              {settingText(s, "password_submit_label")}
            </button>
          </form>
        </AccountBlock>
      ) : null}
      <form
        className="member-account-logout"
        data-member-account="logout"
        onSubmit={(event) => event.preventDefault()}
      >
        <button className="btn btn-secondary" type="button" tabIndex={-1}>
          {settingText(s, "logout_label")}
        </button>
      </form>
    </div>
  );
}

export function MemberAccountPanelSection(
  props: SectionViewProps,
): ReactElement {
  return <AccountPanelPreview {...props} />;
}

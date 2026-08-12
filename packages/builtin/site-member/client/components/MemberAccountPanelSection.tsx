import type { ReactElement, ReactNode } from "react";

import { useTranslation } from "react-i18next";

import {
  settingBool,
  settingText,
} from "../../../marketing/shared/section-schema.js";
import {
  memberDisplayName,
  memberInitials,
} from "../../shared/member-identity.js";
import { listMemberMenuLinks } from "../../shared/member-menu-links.js";
import { memberCardClass } from "../../shared/member-page-settings.js";

import type { SectionViewProps } from "../../../marketing/client/components/sections/section-parts.js";

/** 表单落点，与 SSR 的 `actionsHtml` 同构。 */
function AccountActions({ label }: { label: string }): ReactElement {
  return (
    <div className="member-account-actions">
      <button className="btn" type="button" tabIndex={-1}>
        {label}
      </button>
    </div>
  );
}

/** 资料块的抬头，与 SSR 的 `blockHeadHtml` 同构（两项都空就不占位）。 */
function AccountBlockHead({
  title,
  desc,
}: {
  title: string;
  desc: string;
}): ReactElement | null {
  if (!title && !desc) return null;
  return (
    <div className="member-account-block-head">
      {title ? <h3 className="member-account-block-title">{title}</h3> : null}
      {desc ? <p className="member-account-block-desc">{desc}</p> : null}
    </div>
  );
}

function AccountField({
  id,
  label,
  type,
  value,
}: {
  id: string;
  label: string;
  type: string;
  value?: string;
}): ReactElement {
  return (
    <div className="member-auth-field">
      <label htmlFor={`preview-${id}`}>{label}</label>
      <input
        id={`preview-${id}`}
        type={type}
        defaultValue={value}
        readOnly
        tabIndex={-1}
      />
    </div>
  );
}

function PreviewForm({
  kind,
  children,
}: {
  kind: string;
  children: ReactNode;
}): ReactElement {
  return (
    <form
      className="member-auth"
      data-member-account={kind}
      onSubmit={(event) => event.preventDefault()}
    >
      {children}
    </form>
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
 *
 * 「修改密码」那一块预览里也是**收着**的，与会员看到的一致。站长要调里面的文案，点开
 * 就是——让预览默认展开，改完文案发布出去才发现线上是折叠的，那才是坑。
 */
function AccountPanelPreview({ section }: SectionViewProps): ReactElement {
  const { t, i18n } = useTranslation("site-member");
  const s = section.settings;
  const heading = settingText(s, "heading");
  const subheading = settingText(s, "subheading");
  const passwordDesc = settingText(s, "password_desc");
  const contributedLinks = listMemberMenuLinks();

  const sample = {
    display_name: t("editor.accountSample.displayName"),
    email: t("editor.accountSample.email"),
  };
  const name = memberDisplayName(sample);

  return (
    <div className={memberCardClass(s, "member-account-card")}>
      {heading || subheading ? (
        <div className="member-auth-head">
          {heading ? <h2>{heading}</h2> : null}
          {subheading ? <p>{subheading}</p> : null}
        </div>
      ) : null}
      <div className="member-account-identity">
        <span className="member-account-avatar" aria-hidden="true">
          {memberInitials(sample)}
        </span>
        <div className="member-account-who">
          <p className="member-account-who-name">{name}</p>
          {sample.email && sample.email !== name ? (
            <p className="member-account-who-email">{sample.email}</p>
          ) : null}
        </div>
        <form
          className="member-account-logout"
          data-member-account="logout"
          onSubmit={(event) => event.preventDefault()}
        >
          <button className="btn btn-ghost" type="button" tabIndex={-1}>
            {settingText(s, "logout_label")}
          </button>
        </form>
      </div>
      {contributedLinks.length > 0 ? (
        <nav className="member-account-links" aria-label={t("entry.links")}>
          {contributedLinks.map((link) => (
            <a key={link.id} href={link.href}>
              {link.label_key
                ? i18n.t(link.label_key)
                : (link.labels[
                    i18n.language as keyof typeof link.labels
                  ] ?? link.labels["zh-CN"])}
            </a>
          ))}
        </nav>
      ) : null}
      {settingBool(s, "show_meta") ? (
        <dl className="member-account-meta">
          <div>
            <dt>{settingText(s, "created_label")}</dt>
            <dd>{t("editor.accountSample.date")}</dd>
          </div>
          <div>
            <dt>{settingText(s, "last_login_label")}</dt>
            <dd>{t("editor.accountSample.date")}</dd>
          </div>
        </dl>
      ) : null}
      <section className="member-account-block">
        <AccountBlockHead
          title={settingText(s, "profile_title")}
          desc={settingText(s, "profile_desc")}
        />
        <PreviewForm kind="profile">
          <AccountField
            id="account-name"
            label={settingText(s, "display_name_label")}
            type="text"
            value={sample.display_name}
          />
          <AccountActions label={settingText(s, "save_label")} />
        </PreviewForm>
      </section>
      {settingBool(s, "show_password") ? (
        <details className="member-account-block member-account-disclosure">
          <summary className="member-account-summary">
            <span className="member-account-summary-text">
              <span className="member-account-block-title">
                {settingText(s, "password_divider")}
              </span>
              {passwordDesc ? (
                <span className="member-account-block-desc">{passwordDesc}</span>
              ) : null}
            </span>
            <span className="member-account-summary-mark" aria-hidden="true" />
          </summary>
          <PreviewForm kind="password">
            <AccountField
              id="old-password"
              label={settingText(s, "old_password_label")}
              type="password"
            />
            <AccountField
              id="new-password"
              label={settingText(s, "new_password_label")}
              type="password"
            />
            <AccountField
              id="confirm-password"
              label={settingText(s, "confirm_password_label")}
              type="password"
            />
            <AccountActions label={settingText(s, "password_submit_label")} />
          </PreviewForm>
        </details>
      ) : null}
    </div>
  );
}

export function MemberAccountPanelSection(
  props: SectionViewProps,
): ReactElement {
  return <AccountPanelPreview {...props} />;
}

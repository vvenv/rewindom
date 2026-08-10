import type { ReactElement } from "react";

import { settingBool, settingText } from "../../../marketing/shared/section-schema.js";

import type { SectionViewProps } from "../../../marketing/client/components/sections/section-parts.js";

/**
 * 登录 / 注册表单段的**编辑器预览**。
 *
 * 结构与 SSR 的 `renderAuthForm` 同构，但控件一律 `disabled`：这是版式预览，不是
 * 第二个能登录的入口。真表单只在 SSR 出的那一份里（`/member/login`），预览里能提交
 * 反而危险——运营者在后台预览时把自己登成了会员。
 *
 * 按请求才知道的东西（验证码开没开、哪几家 OAuth）在预览里一概不画：编辑器改的是
 * 文案与版式，画一个假的 GitHub 按钮只会让人以为那是配置项。
 */
function AuthFormPreview({
  section,
  mode,
}: {
  section: SectionViewProps["section"];
  mode: "login" | "register";
}): ReactElement {
  const s = section.settings;
  const fields = [
    { id: "email", label: settingText(s, "email_label"), type: "email" },
    { id: "password", label: settingText(s, "password_label"), type: "password" },
    ...(mode === "register" && settingBool(s, "show_display_name")
      ? [
          {
            id: "display_name",
            label: settingText(s, "display_name_label"),
            type: "text",
          },
        ]
      : []),
  ];
  const altLabel = settingText(s, "alt_label");

  return (
    <>
      <div className="member-auth">
        {fields.map((field) => (
          <div key={field.id} className="member-auth-field">
            <label htmlFor={`preview-${field.id}`}>{field.label}</label>
            <input
              id={`preview-${field.id}`}
              type={field.type}
              disabled
              readOnly
            />
          </div>
        ))}
        <button className="btn member-auth-submit" type="button" disabled>
          {settingText(s, "submit_label")}
        </button>
      </div>
      {settingBool(s, "show_oauth") ? (
        <div className="member-auth-divider">
          <span>{settingText(s, "oauth_divider")}</span>
        </div>
      ) : null}
      {altLabel ? (
        <p className="member-auth-alt">
          {settingText(s, "alt_prompt")} <a href="#preview">{altLabel}</a>
        </p>
      ) : null}
    </>
  );
}

export function MemberLoginFormSection({
  section,
}: SectionViewProps): ReactElement {
  return <AuthFormPreview section={section} mode="login" />;
}

export function MemberRegisterFormSection({
  section,
}: SectionViewProps): ReactElement {
  return <AuthFormPreview section={section} mode="register" />;
}

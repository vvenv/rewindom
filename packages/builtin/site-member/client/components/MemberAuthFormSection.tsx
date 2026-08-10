import type { ReactElement } from "react";

import { usePublicConfig } from "@be-water/client-kit";

import { useSiteLocale } from "../../../marketing/client/components/sections/site-locale-context.js";
import { settingBool, settingText } from "../../../marketing/shared/section-schema.js";
import {
  MEMBER_LOGIN_PATH,
  MEMBER_REGISTER_PATH,
} from "../../shared/member-auth-section.js";

import type { SectionViewProps } from "../../../marketing/client/components/sections/section-parts.js";

/** 各家 IdP 的 mark，与 SSR 的 `OAUTH_MARKS` 同源（那边是字符串，这边是 JSX）。 */
function GitHubMark(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function GoogleMark(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.86c2.26-2.08 3.58-5.15 3.58-8.64Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.86-3a7.2 7.2 0 0 1-10.78-3.79H1.3v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.3A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.58.38-2.3V6.61H1.3A12 12 0 0 0 0 12c0 1.94.46 3.77 1.3 5.39l3.99-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.14 15.24 0 12 0A12 12 0 0 0 1.3 6.61l3.99 3.09A7.17 7.17 0 0 1 12 4.75Z"
      />
    </svg>
  );
}

function MicrosoftMark(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M13 1h10v10H13z" />
      <path fill="#00A4EF" d="M1 13h10v10H1z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  );
}

const OAUTH_PROVIDERS = [
  { id: "github", label: "GitHub", Mark: GitHubMark },
  { id: "google", label: "Google", Mark: GoogleMark },
  { id: "microsoft", label: "Microsoft", Mark: MicrosoftMark },
] as const;

/**
 * 第三方登录那一块（按钮行 + 分隔线），与 SSR 的 `oauthHtml` 同构。
 *
 * 开没开取自 `/api/public/config` —— 那是**真实开关**，不是编出来的：工作台跑在租户
 * 自己的 Host 上，这个接口按 Host 判租户，拿到的就是访客在登录页会看到的那几家。
 * 一家都没配就整块不画（同 SSR），而不是留一条孤零零的「或」分隔线。
 */
function OAuthBlock({ divider }: { divider: string }): ReactElement | null {
  const { data } = usePublicConfig();
  const enabled = OAUTH_PROVIDERS.filter(
    (provider) => data[`${provider.id}_oauth_enabled`],
  );
  if (enabled.length === 0) return null;

  return (
    <>
      <div className="member-auth-oauth-row">
        {enabled.map(({ id, label, Mark }) => (
          <a
            key={id}
            className="btn btn-secondary member-auth-oauth"
            // 真地址（点击被段的选中处理吞掉），预览里也不该指向一个假 href
            href={`/api/member/oauth/${id}`}
            tabIndex={-1}
          >
            <span className="member-auth-mark">
              <Mark />
            </span>
            {label}
          </a>
        ))}
      </div>
      <div className="member-auth-divider">
        <span>{divider}</span>
      </div>
    </>
  );
}

/** 认证卡的抬头：与 SSR 的 `headHtml` 同构——卡里的标题居中、比区块标题小一号。 */
function AuthHead({
  heading,
  subheading,
}: {
  heading: string;
  subheading: string;
}): ReactElement | null {
  if (!heading && !subheading) return null;
  return (
    <div className="member-auth-head">
      {heading ? <h2>{heading}</h2> : null}
      {subheading ? <p>{subheading}</p> : null}
    </div>
  );
}

/**
 * 滑块验证码的静止态。
 *
 * 真页面上这块由 site-enhance 填出可拖的轨道（`enhance/member-auth.ts`），预览只画
 * 它的静止形状——目的是让站长看见表单里多出的这一截高度，不是让人在后台拖着玩。
 * 文案与那边同源，两处都写死（增强脚本进的是另一个 bundle，import 不过来）。
 */
function CaptchaPlaceholder(): ReactElement | null {
  const { data } = usePublicConfig();
  const locale = useSiteLocale();
  if (!data.captcha_enabled) return null;

  return (
    <div className="member-auth-captcha">
      <div className="member-auth-captcha-track">
        <p className="member-auth-captcha-hint">
          {locale === "en" ? "Drag to verify" : "拖动滑块完成验证"}
        </p>
        <div className="member-auth-captcha-handle" />
      </div>
    </div>
  );
}

/**
 * 登录 / 注册表单段的**编辑器预览**。
 *
 * 结构与 SSR 的 `renderAuthForm` 同构——认证卡、抬头、第三方登录、表单、另一张页面的
 * 入口一个不少（`MemberAuthFormSection.test.tsx` 守着这条对齐）。以前这里少画抬头与
 * OAuth 按钮，站长在编辑器里改标题看不见效果、只看见一条空分隔线，预览与访客看到的
 * 差着一大截。
 *
 * 控件不接任何提交：这是版式预览，不是第二个能登录的入口——运营者在后台预览时把自己
 * 登成会员是纯粹的意外。输入框用 `readOnly` 而不是 `disabled`，`disabled` 会被浏览器
 * 改一遍颜色，那又成了另一种失真。
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
  const altPrompt = settingText(s, "alt_prompt");

  return (
    <div
      className={
        settingBool(s, "show_card")
          ? "member-auth-card"
          : "member-auth-card is-plain"
      }
    >
      <AuthHead
        heading={settingText(s, "heading")}
        subheading={settingText(s, "subheading")}
      />
      {settingBool(s, "show_oauth") ? (
        <OAuthBlock divider={settingText(s, "oauth_divider")} />
      ) : null}
      <form
        className="member-auth"
        data-member-auth={mode}
        onSubmit={(event) => event.preventDefault()}
      >
        {fields.map((field) => (
          <div key={field.id} className="member-auth-field">
            <label htmlFor={`preview-${field.id}`}>{field.label}</label>
            <input
              id={`preview-${field.id}`}
              type={field.type}
              readOnly
              tabIndex={-1}
            />
          </div>
        ))}
        <CaptchaPlaceholder />
        <button className="btn member-auth-submit" type="button" tabIndex={-1}>
          {settingText(s, "submit_label")}
        </button>
      </form>
      {altLabel ? (
        <p className="member-auth-alt">
          {altPrompt ? `${altPrompt} ` : ""}
          <a
            href={mode === "login" ? MEMBER_REGISTER_PATH : MEMBER_LOGIN_PATH}
            tabIndex={-1}
          >
            {altLabel}
          </a>
        </p>
      ) : null}
    </div>
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

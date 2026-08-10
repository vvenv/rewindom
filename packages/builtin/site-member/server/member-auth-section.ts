/**
 * 会员登录 / 注册表单段的 SSR 渲染。
 *
 * **产出的是一个真 `<form method="post">`**：没有 JS 也能登录、也能注册。这是把这两页
 * 从 SPA 换成 SSR 的全部理由——认证是入口，不该依赖一个可能加载失败的 bundle。
 * 验证码开启时才需要 JS（滑块），那时由 site-enhance 接管提交。
 *
 * 表单结构由代码写死，只有文案与外观来自段的 settings：租户排的是版式，不是
 * 「提交到哪、校验什么」。
 */

import { escapeHtml } from "../../marketing/shared/html.js";
import { settingBool, settingText } from "../../marketing/shared/section-schema.js";
import { sectionHeading } from "../../marketing/shared/sections/_common/html.js";
import {
  registerSiteSectionHtml,
  type SectionHtmlRenderer,
} from "../../marketing/shared/sections/html.js";
import { MEMBER_AUTH_CSS } from "../shared/member-auth-css.js";
import {
  memberLoginFormSection,
  memberRegisterFormSection,
  readMemberAuthContext,
  type MemberAuthRenderContext,
} from "../shared/member-auth-section.js";

/** 各家 IdP 的 mark，与 SPA 的 `MemberOAuthButtons` 同源（那边是 JSX，这边是字符串）。 */
const OAUTH_MARKS: Record<string, string> = {
  github: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`,
  google: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.86c2.26-2.08 3.58-5.15 3.58-8.64Z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.86-3a7.2 7.2 0 0 1-10.78-3.79H1.3v3.09A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" d="M5.29 14.3A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.58.38-2.3V6.61H1.3A12 12 0 0 0 0 12c0 1.94.46 3.77 1.3 5.39l3.99-3.09Z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.14 15.24 0 12 0A12 12 0 0 0 1.3 6.61l3.99 3.09A7.17 7.17 0 0 1 12 4.75Z"/></svg>`,
  microsoft: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#F25022" d="M1 1h10v10H1z"/><path fill="#7FBA00" d="M13 1h10v10H13z"/><path fill="#00A4EF" d="M1 13h10v10H1z"/><path fill="#FFB900" d="M13 13h10v10H13z"/></svg>`,
};

function fieldHtml(input: {
  id: string;
  name: string;
  type: string;
  label: string;
  autocomplete: string;
  required: boolean;
  value?: string;
}): string {
  const value = input.value ? ` value="${escapeHtml(input.value)}"` : "";
  return `<div class="member-auth-field">
  <label for="${escapeHtml(input.id)}">${escapeHtml(input.label)}</label>
  <input id="${escapeHtml(input.id)}" name="${escapeHtml(input.name)}" type="${escapeHtml(input.type)}" autocomplete="${escapeHtml(input.autocomplete)}"${input.required ? " required" : ""}${value} />
</div>`;
}

function oauthHtml(
  ctx: MemberAuthRenderContext,
  divider: string,
  labels: Record<string, string>,
): string {
  const providers = (["github", "google", "microsoft"] as const).filter(
    (provider) => ctx[`${provider}_oauth_enabled`],
  );
  if (providers.length === 0) return "";
  const redirect = `?redirect=${encodeURIComponent(ctx.redirect)}`;
  const buttons = providers
    .map(
      (provider) =>
        `<a class="btn btn-secondary member-auth-oauth" href="/api/member/oauth/${provider}${redirect}"><span class="member-auth-mark">${OAUTH_MARKS[provider]}</span>${escapeHtml(labels[provider] ?? provider)}</a>`,
    )
    .join("");
  return `<div class="member-auth-divider"><span>${escapeHtml(divider)}</span></div><div class="member-auth-oauth-row">${buttons}</div>`;
}

/**
 * 验证码挂点。
 *
 * 首屏只出一个占位与隐藏字段：滑块本身要拖，没有 JS 就没有滑块，所以**验证码开启时
 * 无 JS 提交必然失败**——那时服务端返回的错误就是「请完成验证」，而不是静默通过。
 * 挑战地址写在 data 属性上，增强脚本据此拉一次 `/api/captcha/challenge`。
 */
function captchaHtml(ctx: MemberAuthRenderContext): string {
  if (!ctx.captcha_enabled) return "";
  return `<div class="member-auth-captcha" data-member-captcha="${escapeHtml(ctx.captcha_challenge_path)}"></div><input type="hidden" name="captcha" value="" />`;
}

function altLinkHtml(
  prompt: string,
  label: string,
  href: string,
): string {
  if (!label) return "";
  return `<p class="member-auth-alt">${prompt ? `${escapeHtml(prompt)} ` : ""}<a href="${escapeHtml(href)}">${escapeHtml(label)}</a></p>`;
}

function renderAuthForm(
  mode: "login" | "register",
  section: Parameters<SectionHtmlRenderer>[0],
  ctx: Parameters<SectionHtmlRenderer>[1],
): string {
  const auth = readMemberAuthContext(ctx);
  /*
   * 拿不到上下文 = 这一段被摆到了它不该在的地方（普通页面、编辑器预览之外的路径）。
   * 什么都不渲染，与「段放错了地方」同一个观感——绝不能吐一个 action 为空的登录框。
   */
  if (!auth) return "";

  const s = section.settings;
  const labels = {
    github: "GitHub",
    google: "Google",
    microsoft: "Microsoft",
  };
  const error = auth.error
    ? `<p class="member-auth-error" role="alert">${escapeHtml(auth.error)}</p>`
    : "";
  const displayName =
    mode === "register" && settingBool(s, "show_display_name")
      ? fieldHtml({
          id: "member-display-name",
          name: "display_name",
          type: "text",
          label: settingText(s, "display_name_label"),
          autocomplete: "nickname",
          required: false,
        })
      : "";

  const fields = [
    fieldHtml({
      id: "member-email",
      name: "email",
      type: "email",
      label: settingText(s, "email_label"),
      autocomplete: "email",
      required: true,
      value: auth.email,
    }),
    fieldHtml({
      id: "member-password",
      name: "password",
      type: "password",
      label: settingText(s, "password_label"),
      autocomplete: mode === "login" ? "current-password" : "new-password",
      required: true,
    }),
    displayName,
  ].join("");

  const oauth = settingBool(s, "show_oauth")
    ? oauthHtml(auth, settingText(s, "oauth_divider"), labels)
    : "";

  return `${sectionHeading(s)}<form class="member-auth" method="post" action="${escapeHtml(auth.action)}" data-member-auth="${mode}">
  ${error}
  <input type="hidden" name="redirect" value="${escapeHtml(auth.redirect)}" />
  ${fields}
  ${captchaHtml(auth)}
  <button class="btn member-auth-submit" type="submit">${escapeHtml(settingText(s, "submit_label"))}</button>
</form>${oauth}${altLinkHtml(
    settingText(s, "alt_prompt"),
    settingText(s, "alt_label"),
    auth.alt_href,
  )}`;
}

const renderLoginFormHtml: SectionHtmlRenderer = (section, ctx) =>
  renderAuthForm("login", section, ctx);

const renderRegisterFormHtml: SectionHtmlRenderer = (section, ctx) =>
  renderAuthForm("register", section, ctx);

/** 在模块 `onBoot` 里调；顺手把定义也登记进 marketing 的注册表。 */
export function registerMemberAuthSections(): void {
  registerSiteSectionHtml(memberLoginFormSection, renderLoginFormHtml, {
    css: MEMBER_AUTH_CSS,
  });
  registerSiteSectionHtml(memberRegisterFormSection, renderRegisterFormHtml, {
    css: MEMBER_AUTH_CSS,
  });
}

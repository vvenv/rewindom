/**
 * 会员登录 / 注册表单段的定义 —— **一份**，两端 import 同一个。
 *
 * 这两段是各自模板页（`member_login` / `member_register`）的**必备段**：版式随租户排，
 * 表单本身由代码渲染。租户能改的是文案与外观，不能改的是「提交到哪、校验什么」——
 * 那是认证面，不该由页面内容决定。
 *
 * `page_kinds` 把它们钉在自己那张模板页上：登录表单出现在官网某张普通页面中间，
 * 要么什么都渲染不出（拿不到按请求的上下文），要么就是官网上凭空多一个登录框。
 */

import {
  headingSettings,
  layoutSettings,
  styleSettings,
} from "../../marketing/shared/sections/_common/settings.js";

import { TENANT_SITE_MEMBER_ENTITLEMENT } from "./entitlements.js";

import type { SectionDefinition } from "../../marketing/shared/section-schema.js";
import type { SectionRenderContext } from "../../marketing/shared/sections/render-context.js";

export const MEMBER_LOGIN_FORM_SECTION_TYPE = "site-member.login-form";
export const MEMBER_REGISTER_FORM_SECTION_TYPE = "site-member.register-form";

export const MEMBER_LOGIN_PAGE_KIND = "member_login";
export const MEMBER_REGISTER_PAGE_KIND = "member_register";

export const MEMBER_LOGIN_PATH = "/member/login";
export const MEMBER_REGISTER_PATH = "/member/register";

/**
 * 表单段的按请求数据（走 `SectionRenderContext.contributed["site-member"]`）。
 *
 * 「验证码开没开、哪几家 OAuth 可用、上一次提交错在哪」都是按请求变的，塞不进段的
 * settings；也不该让 marketing 认识这些字段——它只负责原样透传。
 */
export interface MemberAuthRenderContext {
  /** 表单 POST 到哪（就是当前页地址，带上 redirect 查询串）。 */
  action: string;
  /** 登录成功后回哪儿；已由服务端做过「只允许站内相对路径」的校验。 */
  redirect: string;
  /** 另一张认证页的地址（登录页指向注册页，反之亦然），已带 redirect。 */
  alt_href: string;
  captcha_enabled: boolean;
  github_oauth_enabled: boolean;
  google_oauth_enabled: boolean;
  microsoft_oauth_enabled: boolean;
  /** 上一次提交的错误（服务端已按访客语言翻译好的整句）。 */
  error: string | null;
  /** 回填邮箱：密码打错不该连邮箱一起重打。 */
  email: string;
  /** 验证码开启时给增强脚本的挑战接口路径。 */
  captcha_challenge_path: string;
}

const CONTEXT_KEY = "site-member";

/** 收口断言：贡献方自己读自己的那一格，别让每个渲染器各写一遍 `as`。 */
export function readMemberAuthContext(
  ctx: SectionRenderContext,
): MemberAuthRenderContext | null {
  const value = ctx.contributed?.[CONTEXT_KEY];
  return value ? (value as MemberAuthRenderContext) : null;
}

/** 渲染侧塞进去时也走这里，key 只有一处写死。 */
export function memberAuthContextEntry(
  context: MemberAuthRenderContext,
): Record<string, unknown> {
  return { [CONTEXT_KEY]: context };
}

/** 两段共有的文案位：字段标签也是内容，租户可以改。 */
function sharedAuthSettings(
  submitDefault: string,
): SectionDefinition["settings"] {
  return [
    ...headingSettings(),
    { type: "header", content: "site-member:section.auth.fields" },
    {
      type: "text",
      id: "email_label",
      label: "site-member:section.auth.emailLabel",
      default: "Email",
      required: true,
    },
    {
      type: "text",
      id: "password_label",
      label: "site-member:section.auth.passwordLabel",
      default: "Password",
      required: true,
    },
    {
      type: "text",
      id: "submit_label",
      label: "site-member:section.auth.submitLabel",
      default: submitDefault,
      required: true,
    },
    { type: "header", content: "site-member:section.auth.oauth" },
    {
      type: "checkbox",
      id: "show_oauth",
      label: "site-member:section.auth.showOauth",
      default: true,
      info: "site-member:section.auth.showOauthInfo",
    },
    {
      type: "text",
      id: "oauth_divider",
      label: "site-member:section.auth.oauthDivider",
      default: "or",
    },
  ];
}

/** 指向另一张认证页的那一行（登录 ⇄ 注册）。 */
function altLinkSettings(
  promptDefault: string,
  labelDefault: string,
): SectionDefinition["settings"] {
  return [
    { type: "header", content: "site-member:section.auth.altLink" },
    {
      type: "text",
      id: "alt_prompt",
      label: "site-member:section.auth.altPrompt",
      default: promptDefault,
    },
    {
      type: "text",
      id: "alt_label",
      label: "site-member:section.auth.altLabel",
      default: labelDefault,
    },
  ];
}

export const memberLoginFormSection: SectionDefinition = {
  type: MEMBER_LOGIN_FORM_SECTION_TYPE,
  label: "site-member:section.loginForm.label",
  placements: ["page"],
  entitlement: TENANT_SITE_MEMBER_ENTITLEMENT.key,
  page_kinds: [MEMBER_LOGIN_PAGE_KIND],
  settings: [
    ...sharedAuthSettings("Sign in"),
    ...altLinkSettings("New here?", "Create an account"),
    // 认证卡本来就窄，默认收进 narrow：铺满整幅的登录框没人这么排
    ...layoutSettings({ content_width: "narrow" }),
    ...styleSettings(),
  ],
};

export const memberRegisterFormSection: SectionDefinition = {
  type: MEMBER_REGISTER_FORM_SECTION_TYPE,
  label: "site-member:section.registerForm.label",
  placements: ["page"],
  entitlement: TENANT_SITE_MEMBER_ENTITLEMENT.key,
  page_kinds: [MEMBER_REGISTER_PAGE_KIND],
  settings: [
    ...sharedAuthSettings("Create account"),
    {
      type: "checkbox",
      id: "show_display_name",
      label: "site-member:section.auth.showDisplayName",
      default: true,
    },
    {
      type: "text",
      id: "display_name_label",
      label: "site-member:section.auth.displayNameLabel",
      default: "Display name",
    },
    ...altLinkSettings("Already have an account?", "Sign in"),
    ...layoutSettings({ content_width: "narrow" }),
    ...styleSettings(),
  ],
};

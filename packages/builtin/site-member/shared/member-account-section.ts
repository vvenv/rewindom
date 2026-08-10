/**
 * 「我的账户」面板段的定义 —— **一份**，两端 import 同一个。
 *
 * 与登录 / 注册同一套机制：`/member/account` 是第三张模板页（`member_account`），
 * 版式随租户在 Theme Editor 里排，套自己的页头页脚与主题；面板本身由代码渲染。
 *
 * 这一页以前是 SPA 里的一张「中性外壳」页——没有站点页头页脚，也进不了编辑器。
 * 访客登录之后跳过去，会看见一张和刚才那个站毫无关系的白页；而站长想在上面加一句
 * 「会员权益说明」都没有地方加。收进模板页之后这两件事一起解决了。
 *
 * 表单是真 `<form method="post">`：改昵称、改密码、退出登录没有 JS 也做得到，
 * 同 `/member/login` 的理由——会员页是访客的自助入口，不该依赖一个可能加载失败的 bundle。
 */

import { headingSettings } from "../../marketing/shared/sections/_common/settings.js";

import { TENANT_SITE_MEMBER_ENTITLEMENT } from "./entitlements.js";
import {
  memberCardSettings,
  memberPageLayoutSettings,
} from "./member-page-settings.js";

import type { SectionDefinition } from "../../marketing/shared/section-schema.js";
import type { SectionRenderContext } from "../../marketing/shared/sections/render-context.js";

export const MEMBER_ACCOUNT_PANEL_SECTION_TYPE = "site-member.account-panel";
export const MEMBER_ACCOUNT_PAGE_KIND = "member_account";
export const MEMBER_ACCOUNT_PATH = "/member/account";

/** 三张表单各自的意图，随 POST 一起发上来（一张页面上三个 form）。 */
export type MemberAccountIntent = "profile" | "password" | "logout";

/** 收窄用户输入：认不出的 `intent` 一律当没填（调用方按「改资料」兜底）。 */
export function parseMemberAccountIntent(
  value: unknown,
): MemberAccountIntent | null {
  return value === "profile" || value === "password" || value === "logout"
    ? value
    : null;
}

/**
 * 账户面板的按请求数据（走 `SectionRenderContext.contributed["site-member.account"]`）。
 *
 * 「这人是谁、上次什么时候登录、刚才那次提交成了没有」都是按请求变的，塞不进段的
 * settings；也不该让 marketing 认识这些字段——它只负责原样透传。
 */
export interface MemberAccountRenderContext {
  /** 三张表单都 POST 到这里（就是当前页地址），靠 `intent` 分流。 */
  action: string;
  email: string;
  display_name: string;
  /** 已按访客语言格式化好的时间；没有值时是那句「—」。 */
  created_at: string;
  last_login_at: string;
  /** 上一次提交的结果，服务端已按访客语言翻好的整句。 */
  error: string | null;
  notice: string | null;
  /**
   * 上一次提交来自哪张表单（没提交过就是 `null`）。
   *
   * 「改密码」平时是折叠的。改密码填错了却折回去，会员看到的是一句错误提示和一块
   * 关着的抽屉——错在哪一栏、要重填什么，全得自己再点开找。带着这个字段回来，那一块
   * 就展开着渲染。
   */
  intent: MemberAccountIntent | null;
}

const CONTEXT_KEY = "site-member.account";

/** 收口断言：贡献方自己读自己的那一格，别让每个渲染器各写一遍 `as`。 */
export function readMemberAccountContext(
  ctx: SectionRenderContext,
): MemberAccountRenderContext | null {
  const value = ctx.contributed?.[CONTEXT_KEY];
  return value ? (value as MemberAccountRenderContext) : null;
}

/** 渲染侧塞进去时也走这里，key 只有一处写死。 */
export function memberAccountContextEntry(
  context: MemberAccountRenderContext,
): Record<string, unknown> {
  return { [CONTEXT_KEY]: context };
}

export const memberAccountPanelSection: SectionDefinition = {
  type: MEMBER_ACCOUNT_PANEL_SECTION_TYPE,
  label: "site-member:section.accountPanel.label",
  placements: ["page"],
  entitlement: TENANT_SITE_MEMBER_ENTITLEMENT.key,
  // 钉在自己那张模板页上：账户面板出现在官网某张普通页面中间什么都渲染不出来
  page_kinds: [MEMBER_ACCOUNT_PAGE_KIND],
  settings: [
    ...headingSettings(),
    /*
     * 邮箱没有「标签 / 说明」两项设置：它不再是一个 `readonly` 的输入框，而是身份条上
     * 的一行文字。一个长得能改、点进去又不让改的框，比一句「邮箱不可修改」更难懂。
     */
    { type: "header", content: "site-member:section.account.profile" },
    {
      type: "text",
      id: "profile_title",
      label: "site-member:section.account.profileTitle",
      default: "Account details",
    },
    {
      type: "text",
      id: "profile_desc",
      label: "site-member:section.account.profileDesc",
      default: "",
    },
    {
      type: "text",
      id: "display_name_label",
      label: "site-member:section.auth.displayNameLabel",
      default: "Display name",
      required: true,
    },
    {
      type: "text",
      id: "save_label",
      label: "site-member:section.account.saveLabel",
      default: "Save",
      required: true,
    },
    {
      type: "checkbox",
      id: "show_meta",
      label: "site-member:section.account.showMeta",
      default: true,
      info: "site-member:section.account.showMetaInfo",
    },
    {
      type: "text",
      id: "created_label",
      label: "site-member:section.account.createdLabel",
      default: "Member since",
    },
    {
      type: "text",
      id: "last_login_label",
      label: "site-member:section.account.lastLoginLabel",
      default: "Last sign-in",
    },
    { type: "header", content: "site-member:section.account.password" },
    {
      type: "checkbox",
      id: "show_password",
      label: "site-member:section.account.showPassword",
      default: true,
      info: "site-member:section.account.showPasswordInfo",
    },
    {
      type: "text",
      id: "password_divider",
      label: "site-member:section.account.passwordTitle",
      default: "Change password",
    },
    {
      type: "text",
      id: "password_desc",
      label: "site-member:section.account.passwordDesc",
      default: "",
    },
    {
      type: "text",
      id: "old_password_label",
      label: "site-member:section.account.oldPasswordLabel",
      default: "Current password",
      required: true,
    },
    {
      type: "text",
      id: "new_password_label",
      label: "site-member:section.account.newPasswordLabel",
      default: "New password",
      required: true,
    },
    {
      type: "text",
      id: "confirm_password_label",
      label: "site-member:section.account.confirmPasswordLabel",
      default: "Confirm new password",
      required: true,
    },
    {
      type: "text",
      id: "password_submit_label",
      label: "site-member:section.account.passwordSubmitLabel",
      default: "Change password",
      required: true,
    },
    { type: "header", content: "site-member:section.account.session" },
    {
      type: "text",
      id: "logout_label",
      label: "site-member:section.account.logoutLabel",
      default: "Log out",
      required: true,
    },
    ...memberCardSettings(),
    ...memberPageLayoutSettings(),
  ],
};

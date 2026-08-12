/**
 * 会员那三张页面（登录 / 注册 / 我的账户）的**模板页**登记与兜底版式。
 *
 * 与文档库的两张版式同一套机制（`marketing/shared/page-templates.ts`）：kind 唯一、
 * slug 固定、默认不落库——租户没自定义过时 SSR 按这里的预设渲染，自定义之后就是一张
 * 普通页面记录，走同一个编辑器、同一套发布流程。
 *
 * 元数据在**两端**都要登记（写路径要按 kind 校验 slug，中台要列出这几行），所以由
 * `registerMemberPageTemplates()` 统一暴露，server 的 `onBoot` 与 client manifest
 * 各调一次；重复登记是幂等的。
 */

import {
  registerPageTemplateKind,
  registerPageTemplatePreset,
} from "../../marketing/shared/page-templates.js";

import {
  MEMBER_ACCOUNT_PAGE_KIND,
  MEMBER_ACCOUNT_PANEL_SECTION_TYPE,
  MEMBER_ACCOUNT_PATH,
} from "./member-account-section.js";
import {
  MEMBER_LOGIN_FORM_SECTION_TYPE,
  MEMBER_LOGIN_PAGE_KIND,
  MEMBER_LOGIN_PATH,
  MEMBER_REGISTER_FORM_SECTION_TYPE,
  MEMBER_REGISTER_PAGE_KIND,
  MEMBER_REGISTER_PATH,
} from "./member-auth-section.js";

import type { PagePreset } from "../../marketing/shared/page-presets.types.js";

/**
 * 中台「会员页版式」分组。
 *
 * 所有 `/member/*` 模板页共用这一 key——登录 / 注册 / 账户由本模块登记，订阅页由
 * `site-billing`（`requires: site-member`）复用。分组身份是 key，不是各模块各写一份
 * 碰巧同名的文案。
 */
export const MEMBER_PAGE_TEMPLATE_GROUP = "site-member:template.group";

/** 固定 slug：kind 决定地址，租户改不了（改了会员就找不到登录页了）。 */
export const MEMBER_LOGIN_TEMPLATE_SLUG = "member-login";
export const MEMBER_REGISTER_TEMPLATE_SLUG = "member-register";
export const MEMBER_ACCOUNT_TEMPLATE_SLUG = "member-account";

/**
 * 兜底版式：一句标题 + 表单，就这两段。
 *
 * 登录页是**入口**不是内容，起步版式越素越好——租户想加插画、加公告条，在编辑器里
 * 自己往上摞；反过来「先删掉六段别人的东西」才是劝退的那一步。
 */
export const MEMBER_LOGIN_TEMPLATE_PRESET: PagePreset = {
  key: MEMBER_LOGIN_PAGE_KIND,
  label: "site-member:template.login.label",
  kind: MEMBER_LOGIN_PAGE_KIND,
  slug: MEMBER_LOGIN_TEMPLATE_SLUG,
  titleKey: "site-member:login.title",
  descriptionKey: "site-member:login.subtitle",
  sections: [
    {
      type: MEMBER_LOGIN_FORM_SECTION_TYPE,
      text: {
        heading: "site-member:login.title",
        subheading: "site-member:login.subtitle",
        email_label: "site-member:fields.email",
        password_label: "site-member:fields.password",
        submit_label: "site-member:login.submit",
        oauth_divider: "site-member:oauth.or",
        alt_prompt: "site-member:login.no_account",
        alt_label: "site-member:login.go_register",
      },
    },
  ],
};

export const MEMBER_REGISTER_TEMPLATE_PRESET: PagePreset = {
  key: MEMBER_REGISTER_PAGE_KIND,
  label: "site-member:template.register.label",
  kind: MEMBER_REGISTER_PAGE_KIND,
  slug: MEMBER_REGISTER_TEMPLATE_SLUG,
  titleKey: "site-member:register.title",
  descriptionKey: "site-member:register.subtitle",
  sections: [
    {
      type: MEMBER_REGISTER_FORM_SECTION_TYPE,
      text: {
        heading: "site-member:register.title",
        subheading: "site-member:register.subtitle",
        email_label: "site-member:fields.email",
        password_label: "site-member:fields.password",
        display_name_label: "site-member:fields.display_name",
        submit_label: "site-member:register.submit",
        oauth_divider: "site-member:oauth.or",
        alt_prompt: "site-member:register.has_account",
        alt_label: "site-member:register.go_login",
      },
    },
  ],
};

export const MEMBER_ACCOUNT_TEMPLATE_PRESET: PagePreset = {
  key: MEMBER_ACCOUNT_PAGE_KIND,
  label: "site-member:template.account.label",
  kind: MEMBER_ACCOUNT_PAGE_KIND,
  slug: MEMBER_ACCOUNT_TEMPLATE_SLUG,
  titleKey: "site-member:account.title",
  descriptionKey: "site-member:account.subtitle",
  sections: [
    {
      type: MEMBER_ACCOUNT_PANEL_SECTION_TYPE,
      text: {
        heading: "site-member:account.title",
        subheading: "site-member:account.subtitle",
        profile_title: "site-member:account.profile_title",
        profile_desc: "site-member:account.profile_desc",
        display_name_label: "site-member:fields.display_name",
        save_label: "site-member:account.save",
        created_label: "site-member:account.created_at",
        last_login_label: "site-member:account.last_login_at",
        password_divider: "site-member:account.password_title",
        password_desc: "site-member:account.password_desc",
        old_password_label: "site-member:fields.old_password",
        new_password_label: "site-member:fields.new_password",
        confirm_password_label: "site-member:fields.confirm_password",
        password_submit_label: "site-member:account.password_title",
        logout_label: "site-member:account.logout",
      },
    },
  ],
};

/** 登记三张模板页（幂等）；server `onBoot` 与 client manifest 各调一次。 */
export function registerMemberPageTemplates(): void {
  registerPageTemplateKind({
    kind: MEMBER_LOGIN_PAGE_KIND,
    slug: MEMBER_LOGIN_TEMPLATE_SLUG,
    path: MEMBER_LOGIN_PATH,
    group: MEMBER_PAGE_TEMPLATE_GROUP,
    label: "site-member:template.login.label",
    required_section: MEMBER_LOGIN_FORM_SECTION_TYPE,
  });
  registerPageTemplateKind({
    kind: MEMBER_REGISTER_PAGE_KIND,
    slug: MEMBER_REGISTER_TEMPLATE_SLUG,
    path: MEMBER_REGISTER_PATH,
    group: MEMBER_PAGE_TEMPLATE_GROUP,
    label: "site-member:template.register.label",
    required_section: MEMBER_REGISTER_FORM_SECTION_TYPE,
  });
  registerPageTemplatePreset(
    MEMBER_LOGIN_PAGE_KIND,
    MEMBER_LOGIN_TEMPLATE_PRESET,
  );
  registerPageTemplatePreset(
    MEMBER_REGISTER_PAGE_KIND,
    MEMBER_REGISTER_TEMPLATE_PRESET,
  );
  registerPageTemplateKind({
    kind: MEMBER_ACCOUNT_PAGE_KIND,
    slug: MEMBER_ACCOUNT_TEMPLATE_SLUG,
    path: MEMBER_ACCOUNT_PATH,
    group: MEMBER_PAGE_TEMPLATE_GROUP,
    label: "site-member:template.account.label",
    required_section: MEMBER_ACCOUNT_PANEL_SECTION_TYPE,
  });
  registerPageTemplatePreset(
    MEMBER_ACCOUNT_PAGE_KIND,
    MEMBER_ACCOUNT_TEMPLATE_PRESET,
  );
}

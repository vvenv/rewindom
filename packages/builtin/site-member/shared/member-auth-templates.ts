/**
 * 会员登录 / 注册页的**模板页**登记与兜底版式。
 *
 * 与文档库的两张版式同一套机制（`marketing/shared/page-templates.ts`）：kind 唯一、
 * slug 固定、默认不落库——租户没自定义过时 SSR 按这里的预设渲染，自定义之后就是一张
 * 普通页面记录，走同一个编辑器、同一套发布流程。
 *
 * 元数据在**两端**都要登记（写路径要按 kind 校验 slug，中台要列出这两行），所以由
 * `registerMemberAuthTemplates()` 统一暴露，server 的 `onBoot` 与 client manifest
 * 各调一次；重复登记是幂等的。
 */

import {
  registerPageTemplateKind,
  registerPageTemplatePreset,
} from "../../marketing/shared/page-templates.js";

import { TENANT_SITE_MEMBER_ENTITLEMENT } from "./entitlements.js";
import {
  MEMBER_LOGIN_FORM_SECTION_TYPE,
  MEMBER_LOGIN_PAGE_KIND,
  MEMBER_LOGIN_PATH,
  MEMBER_REGISTER_FORM_SECTION_TYPE,
  MEMBER_REGISTER_PAGE_KIND,
  MEMBER_REGISTER_PATH,
} from "./member-auth-section.js";

import type { PagePreset } from "../../marketing/shared/page-presets.types.js";

/** 固定 slug：kind 决定地址，租户改不了（改了会员就找不到登录页了）。 */
export const MEMBER_LOGIN_TEMPLATE_SLUG = "member-login";
export const MEMBER_REGISTER_TEMPLATE_SLUG = "member-register";

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

/** 登记两张模板页（幂等）；server `onBoot` 与 client manifest 各调一次。 */
export function registerMemberAuthTemplates(): void {
  registerPageTemplateKind({
    kind: MEMBER_LOGIN_PAGE_KIND,
    slug: MEMBER_LOGIN_TEMPLATE_SLUG,
    path: MEMBER_LOGIN_PATH,
    group: "site-member:template.group",
    label: "site-member:template.login.label",
    required_section: MEMBER_LOGIN_FORM_SECTION_TYPE,
    entitlement: TENANT_SITE_MEMBER_ENTITLEMENT.key,
  });
  registerPageTemplateKind({
    kind: MEMBER_REGISTER_PAGE_KIND,
    slug: MEMBER_REGISTER_TEMPLATE_SLUG,
    path: MEMBER_REGISTER_PATH,
    group: "site-member:template.group",
    label: "site-member:template.register.label",
    required_section: MEMBER_REGISTER_FORM_SECTION_TYPE,
    entitlement: TENANT_SITE_MEMBER_ENTITLEMENT.key,
  });
  registerPageTemplatePreset(
    MEMBER_LOGIN_PAGE_KIND,
    MEMBER_LOGIN_TEMPLATE_PRESET,
  );
  registerPageTemplatePreset(
    MEMBER_REGISTER_PAGE_KIND,
    MEMBER_REGISTER_TEMPLATE_PRESET,
  );
}

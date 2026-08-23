/**
 * 订阅页、确认页、退订页三张**模板页**的登记与兜底版式。
 *
 * 与会员那三张页同一套机制（`marketing/shared/page-templates.ts`）：kind 唯一、
 * slug 固定，相关时由 marketing 快照落库；没落库时 SSR 按这里的预设兜底——
 * **退订不能因为站长还没点过「初始化版式」就失效**。
 *
 * 元数据两端都要登记（写路径按 kind 校验 slug，中台要列出这两行），所以由
 * `registerNewsletterPageTemplates()` 统一暴露，server `onBoot` 与 client manifest
 * 各调一次；重复登记是幂等的。
 */
import { NEWSLETTER_ENTITLEMENT } from "./entitlements.js";
import {
  NEWSLETTER_CONFIRM_PAGE_KIND,
  NEWSLETTER_CONFIRM_SECTION_TYPE,
} from "./sections/confirm/definition.js";
import {
  NEWSLETTER_SUBSCRIBE_PAGE_KIND,
  NEWSLETTER_SUBSCRIBE_SECTION_TYPE,
} from "./sections/subscribe/definition.js";
import {
  NEWSLETTER_UNSUBSCRIBE_PAGE_KIND,
  NEWSLETTER_UNSUBSCRIBE_SECTION_TYPE,
} from "./sections/unsubscribe/definition.js";

import {
  registerPageTemplateKind,
  registerPageTemplatePreset,
} from "@rewindom/builtin/marketing/shared/page-templates.js";

import type { PagePreset } from "@rewindom/builtin/marketing/shared/page-presets.types.js";

/**
 * 中台「订阅页版式」分组。
 *
 * 新开一个 key 而不是复用 `site-member:template.group`：那一组的身份是「`/member/*`
 * 会员自助」，订阅确认页跟会员没有关系——订阅刻意不要求注册。
 */
export const NEWSLETTER_PAGE_TEMPLATE_GROUP = "newsletter:template.group";

/** 固定 slug：kind 决定地址，租户改不了——改了地址，已经发出去的邮件里的链接就全废了。 */
export const NEWSLETTER_SUBSCRIBE_TEMPLATE_SLUG = "newsletter-subscribe";
export const NEWSLETTER_CONFIRM_TEMPLATE_SLUG = "newsletter-confirm";
export const NEWSLETTER_UNSUBSCRIBE_TEMPLATE_SLUG = "newsletter-unsubscribe";

/**
 * 订阅页的地址。
 *
 * **不放在 `/newsletter/*` 下**：确认页和退订页是从邮件点进来的一次性事务页，
 * 藏深一点无所谓；订阅页是要贴在首屏按钮、页脚、社交简介里的地址，
 * `/subscribe` 比 `/newsletter/subscribe` 好念也好记。
 *
 * 顶层 slug 要登记成保留字（见 `server/module.ts`），否则租户建一张
 * slug 为 `subscribe` 的 CMS 页会被这条静态路由永远盖住。
 */
export const NEWSLETTER_SUBSCRIBE_PATH = "/subscribe";
export const NEWSLETTER_CONFIRM_PATH = "/newsletter/confirm";
export const NEWSLETTER_UNSUBSCRIBE_PATH = "/newsletter/unsubscribe";

/**
 * 订阅页的兜底版式：一句标题 + 订阅表单。
 *
 * 有了这张页，「订阅地址」就是**确定的**——租户还没把订阅段摆到任何地方时，
 * 首屏按钮也有地方可指。想让订阅框同时出现在首页上，照样把段拖过去，两者不冲突。
 */
export const NEWSLETTER_SUBSCRIBE_TEMPLATE_PRESET: PagePreset = {
  key: NEWSLETTER_SUBSCRIBE_PAGE_KIND,
  label: "newsletter:template.subscribe.label",
  kind: NEWSLETTER_SUBSCRIBE_PAGE_KIND,
  slug: NEWSLETTER_SUBSCRIBE_TEMPLATE_SLUG,
  titleKey: "newsletter:subscribe.title",
  descriptionKey: "newsletter:subscribe.subtitle",
  sections: [
    {
      type: NEWSLETTER_SUBSCRIBE_SECTION_TYPE,
      text: {
        heading: "newsletter:subscribe.title",
        subheading: "newsletter:subscribe.subtitle",
        submit_label: "newsletter:form.submit",
        placeholder: "newsletter:form.emailPlaceholder",
        success_message: "newsletter:form.successDefault",
      },
    },
  ],
};

export const NEWSLETTER_CONFIRM_TEMPLATE_PRESET: PagePreset = {
  key: NEWSLETTER_CONFIRM_PAGE_KIND,
  label: "newsletter:template.confirm.label",
  kind: NEWSLETTER_CONFIRM_PAGE_KIND,
  slug: NEWSLETTER_CONFIRM_TEMPLATE_SLUG,
  titleKey: "newsletter:confirm.title",
  descriptionKey: "newsletter:confirm.subtitle",
  sections: [
    {
      type: NEWSLETTER_CONFIRM_SECTION_TYPE,
      text: {
        heading: "newsletter:confirm.title",
        subheading: "newsletter:confirm.subtitle",
        submit_label: "newsletter:confirm.submit",
        success_message: "newsletter:confirm.success",
        invalid_message: "newsletter:confirm.invalid",
      },
    },
  ],
};

export const NEWSLETTER_UNSUBSCRIBE_TEMPLATE_PRESET: PagePreset = {
  key: NEWSLETTER_UNSUBSCRIBE_PAGE_KIND,
  label: "newsletter:template.unsubscribe.label",
  kind: NEWSLETTER_UNSUBSCRIBE_PAGE_KIND,
  slug: NEWSLETTER_UNSUBSCRIBE_TEMPLATE_SLUG,
  titleKey: "newsletter:unsubscribe.title",
  descriptionKey: "newsletter:unsubscribe.subtitle",
  sections: [
    {
      type: NEWSLETTER_UNSUBSCRIBE_SECTION_TYPE,
      text: {
        heading: "newsletter:unsubscribe.title",
        subheading: "newsletter:unsubscribe.subtitle",
        submit_label: "newsletter:unsubscribe.submitAll",
        success_message: "newsletter:unsubscribe.success",
        invalid_message: "newsletter:unsubscribe.invalid",
      },
    },
  ],
};

/**
 * 登记三张模板页（幂等）。
 *
 * 起步版式一律越素越好——一句标题 + 那一段，就这些。租户想加插画在编辑器里自己摞；
 * 反过来「先删掉五段别人的东西」才是劝退的那一步（会员登录页同一条口径）。
 *
 * 都声明 `entitlement` + `auto_init: false`：订阅是可关的功能，关了不该在中台露出
 * 这三行；开着也不预建——默认给所有存量站点凭空多三张删不掉的空版式是骚扰。
 */
export function registerNewsletterPageTemplates(): void {
  registerPageTemplateKind({
    kind: NEWSLETTER_SUBSCRIBE_PAGE_KIND,
    slug: NEWSLETTER_SUBSCRIBE_TEMPLATE_SLUG,
    path: NEWSLETTER_SUBSCRIBE_PATH,
    group: NEWSLETTER_PAGE_TEMPLATE_GROUP,
    label: "newsletter:template.subscribe.label",
    required_section: NEWSLETTER_SUBSCRIBE_SECTION_TYPE,
    entitlement: NEWSLETTER_ENTITLEMENT.key,
    auto_init: false,
  });
  registerPageTemplatePreset(
    NEWSLETTER_SUBSCRIBE_PAGE_KIND,
    NEWSLETTER_SUBSCRIBE_TEMPLATE_PRESET,
  );

  registerPageTemplateKind({
    kind: NEWSLETTER_CONFIRM_PAGE_KIND,
    slug: NEWSLETTER_CONFIRM_TEMPLATE_SLUG,
    path: NEWSLETTER_CONFIRM_PATH,
    group: NEWSLETTER_PAGE_TEMPLATE_GROUP,
    label: "newsletter:template.confirm.label",
    required_section: NEWSLETTER_CONFIRM_SECTION_TYPE,
    entitlement: NEWSLETTER_ENTITLEMENT.key,
    auto_init: false,
  });
  registerPageTemplatePreset(
    NEWSLETTER_CONFIRM_PAGE_KIND,
    NEWSLETTER_CONFIRM_TEMPLATE_PRESET,
  );

  registerPageTemplateKind({
    kind: NEWSLETTER_UNSUBSCRIBE_PAGE_KIND,
    slug: NEWSLETTER_UNSUBSCRIBE_TEMPLATE_SLUG,
    path: NEWSLETTER_UNSUBSCRIBE_PATH,
    group: NEWSLETTER_PAGE_TEMPLATE_GROUP,
    label: "newsletter:template.unsubscribe.label",
    required_section: NEWSLETTER_UNSUBSCRIBE_SECTION_TYPE,
    entitlement: NEWSLETTER_ENTITLEMENT.key,
    auto_init: false,
  });
  registerPageTemplatePreset(
    NEWSLETTER_UNSUBSCRIBE_PAGE_KIND,
    NEWSLETTER_UNSUBSCRIBE_TEMPLATE_PRESET,
  );
}

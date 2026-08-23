import {
  headingSettings,
  layoutSettings,
} from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import { NEWSLETTER_ENTITLEMENT, NEWSLETTER_SECTION_GROUP } from "../../entitlements.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

/** 段 type 带模块前缀，与 `site-form.form`、`shop.*`、`events.*` 同口径。 */
export const NEWSLETTER_SUBSCRIBE_SECTION_TYPE = "newsletter.subscribe";

/**
 * 邮件订阅入口 —— 官网上第二个**会往回写数据**的段（第一个是 `site-form.form`）。
 *
 * **`list_key` 留空即订阅本站全部可订阅列表**，这是刻意的默认：
 * 绝大多数站点只有一个内容源（比如事件雷达），站长把段拖上去就该能用，
 * 不该逼他先去哪里抄一串 `events:topic:ai` 这样的 key。
 * 想只订某一个列表时才填。
 *
 * 之所以现在不做下拉选择器：候选来自 `registerNewsletterSource()`，是**按请求**的
 * 租户数据，要用 `options_from` 就得再接一条 SSR 贡献上下文链路（shop 的分类选择器
 * 是那么做的）。等真出现「一个站好几个内容源」再上，记在 MODULE.spec 的 out_of_scope。
 *
 * 与 `events.subscribe`（RSS 入口）是两个段，不是重复：RSS 给阅读器用户，
 * 邮件给其余所有人。两者可以同时摆在一张页上。
 */
export const newsletterSubscribeSection: SectionDefinition = {
  type: NEWSLETTER_SUBSCRIBE_SECTION_TYPE,
  label: "newsletter:section.subscribe.label",
  group: NEWSLETTER_SECTION_GROUP,
  placements: ["page"],
  entitlement: NEWSLETTER_ENTITLEMENT.key,
  settings: [
    ...headingSettings(),
    { type: "header", content: "newsletter:section.subscribe.group" },
    {
      type: "text",
      id: "list_key",
      label: "newsletter:section.subscribe.listKey",
      info: "newsletter:section.subscribe.listKeyInfo",
    },
    {
      type: "select",
      id: "cadence",
      label: "newsletter:section.subscribe.cadence",
      default: "weekly",
      options: [
        { value: "weekly", label: "newsletter:cadence.weekly" },
        { value: "daily", label: "newsletter:cadence.daily" },
      ],
    },
    {
      type: "text",
      id: "placeholder",
      label: "newsletter:section.subscribe.placeholder",
      default: "newsletter:form.emailPlaceholder",
    },
    {
      type: "text",
      id: "submit_label",
      label: "newsletter:section.subscribe.submitLabel",
      default: "newsletter:form.submit",
      required: true,
    },
    {
      type: "textarea",
      id: "hint",
      label: "newsletter:section.subscribe.hint",
      rows: 2,
      info: "newsletter:section.subscribe.hintInfo",
    },
    /*
     * 成功文案单独一项：确认信已发出 ≠ 订阅完成，这句话必须说清楚要去收件箱点确认，
     * 否则读者会以为订完了，然后再也不回来点那封确认信。
     */
    {
      type: "textarea",
      id: "success_message",
      label: "newsletter:section.subscribe.successMessage",
      rows: 2,
      default: "newsletter:form.successDefault",
    },
    ...layoutSettings({ padding_top: 48, padding_bottom: 48 }),
  ],
};

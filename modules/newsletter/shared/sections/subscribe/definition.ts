import {
  headingSettings,
  layoutSettings,
} from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import {
  NEWSLETTER_ENTITLEMENT,
  NEWSLETTER_SECTION_GROUP,
} from "../../entitlements.js";
import {
  DEFAULT_DIGEST_CADENCE,
  NEWSLETTER_ALL_LISTS,
  NEWSLETTER_LIST_SELECT_OPTIONS,
} from "../../newsletter.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

/** 段 type 带模块前缀，与 `site-form.form`、`shop.*`、`events.*` 同口径。 */
export const NEWSLETTER_SUBSCRIBE_SECTION_TYPE = "newsletter.subscribe";

/**
 * 邮件订阅入口 —— 官网上第二个**会往回写数据**的段（第一个是 `site-form.form`）。
 *
 * **订阅哪个列表由租户在下拉里选**，默认「本站全部」。
 *
 * 这同时回答了「多个模块都提供订阅源时，段怎么知道自己对应哪一个」——**它不推断**。
 * 按页面上下文猜（当前页是 /events 就订 events）在 RSS 那种「一个链接指向一个 feed」
 * 的场景成立，但订阅段是租户主动摆上去的内容块：摆在首页的订阅框该订什么，
 * 只有摆它的人知道。猜错的代价是读者收到一堆没想订的东西，然后点「举报垃圾邮件」。
 *
 * 候选来自 `registerNewsletterSource()`，是按站点变的运行时数据，走 `options_from`。
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
    /*
     * 下拉而不是文本框——这也是「多个内容源时，段怎么知道自己对应哪一个」的答案：
     * **它不推断，由租户在这里明说**。
     *
     * 候选是**按请求**的租户数据（内容源在 onBoot 登记，各站不同），编译期枚举不出来，
     * 所以走 `options_from` 运行时选项源；下面的静态 `options` 只是候选拉不到时的兜底。
     */
    {
      type: "select",
      id: "list_key",
      label: "newsletter:section.subscribe.listKey",
      info: "newsletter:section.subscribe.listKeyInfo",
      default: NEWSLETTER_ALL_LISTS,
      options: [
        {
          value: NEWSLETTER_ALL_LISTS,
          // 静态兜底项**不能带 {{count}}**：编辑器 t() 它时不传参，会原样吐出占位符
          label: "newsletter:section.subscribe.listAll",
        },
      ],
      options_from: NEWSLETTER_LIST_SELECT_OPTIONS,
    },
    {
      type: "select",
      id: "cadence",
      label: "newsletter:section.subscribe.cadence",
      default: DEFAULT_DIGEST_CADENCE,
      // 每日在前：它是默认，下拉里第一个就该是它
      options: [
        { value: "daily", label: "newsletter:cadence.daily" },
        { value: "weekly", label: "newsletter:cadence.weekly" },
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

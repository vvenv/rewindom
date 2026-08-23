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
 * 订阅页的模板 kind。
 *
 * 这一段**刻意不声明 `page_kinds`**：它既是这张模板页的必备段，也能被摆到任何
 * 别的页面上（首屏下面、页脚上方都常见）。确认页 / 退订页那两个面板才需要钉死
 * ——它们离开自己那张页就没有 token 可用。
 */
export const NEWSLETTER_SUBSCRIBE_PAGE_KIND = "newsletter_subscribe";

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
    /*
     * 抬头默认值与预设 `text.heading` 同一条 key：段被单独拖到首页 / 页脚时也自带
     * 一句抬头（不给的话新加的段是一片空白），跨语言复制页面时才换得成目标语言的
     * 库存句，存量里空掉的槽位也才会在解析时按库存回填。
     */
    ...headingSettings({
      headingDefault: "newsletter:subscribe.title",
      subheadingDefault: "newsletter:subscribe.subtitle",
    }),
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
    /*
     * 默认锚点 `subscribe`：首屏按钮要能跳到这一段，不给默认值的话每个租户都得
     * 自己先想一个 id。同一页摆两个订阅段时 id 会重复（浏览器跳到第一个），
     * 那种情况下租户自己改一个——比「所有人都得手填」划算得多。
     */
    ...layoutSettings({
      padding_top: 48,
      padding_bottom: 48,
      anchor: "subscribe",
    }),
  ],
};

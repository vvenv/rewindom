import { NEWSLETTER_ENTITLEMENT } from "../../entitlements.js";

import { chromeSlotSettings } from "@rewindom/builtin/marketing/shared/sections/_common/chrome-blocks.js";

import type { BlockDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const NEWSLETTER_SUBSCRIBE_BLOCK_TYPE = "newsletter.subscribe-link";

/**
 * 订阅入口 —— 页头 / 页脚的 **chrome 块**。
 *
 * 与页面段 `newsletter.subscribe` 是两个落点，不是重复：
 *
 * | 落点 | 什么时候用 |
 * | --- | --- |
 * | chrome 块 | 站点级常驻入口，全站每页都有，可只显示图标 |
 * | 页面段 | 摆在正文流里，当场能填邮箱 |
 *
 * events 的 RSS 订阅走了两版才想明白这件事（见 `public-rss.spec.yaml` 设计要点 6）：
 * 订阅**不是页面内容**，它是站点级的常驻入口，和语言切换、购物车入口同一类。
 * 这里直接抄结论，不再重走一遍。`singleton` 是必须的：一个站只该有一个订阅入口。
 *
 * **这个块是链接，不是内嵌输入框。** 页头页脚那一排寸土寸金，塞一个 email input
 * 会把版式挤垮，而且它得带上提交、校验、回执三套状态。块点开跳到摆了订阅段的页面。
 */
export const newsletterSubscribeBlock: BlockDefinition = {
  type: NEWSLETTER_SUBSCRIBE_BLOCK_TYPE,
  label: "newsletter:block.subscribeLink.label",
  singleton: true,
  entitlement: NEWSLETTER_ENTITLEMENT.key,
  settings: [
    {
      type: "text",
      id: "label",
      label: "newsletter:block.subscribeLink.linkLabel",
      default: "newsletter:form.submit",
      required: true,
    },
    /*
     * 目标地址由租户填：块不知道订阅段被摆在哪一页上——那要按请求查已发布正文，
     * 是 contributed 上下文的活儿（MODULE.spec 的 out_of_scope 里记着）。
     * 用 `link` 类型，聚合层会替它做 `{token}` 插值（`interpolate-section-settings`）。
     */
    {
      type: "link",
      id: "href",
      label: "newsletter:block.subscribeLink.href",
      placeholder: "/subscribe",
      info: "newsletter:block.subscribeLink.hrefInfo",
    },
    /*
     * 用「只显示图标」而不是「显示文字」：`settingBool` 是严格 `=== true`，
     * 键缺失一律当 false。写成 `show_label: true` 的话，任何缺这个键的存量块
     * 都会**默默变成没有文字的按钮**；写成 `icon_only: false` 则缺键时显示文字，
     * 失效方向是安全的。
     */
    {
      type: "checkbox",
      id: "icon_only",
      label: "newsletter:block.subscribeLink.iconOnly",
      default: false,
      info: "newsletter:block.subscribeLink.iconOnlyInfo",
    },
    // 默认落页脚：订阅是常驻但次要的入口，不该和主导航抢位置
    ...chromeSlotSettings({ align: "end", mobile: "menu" }),
  ],
};

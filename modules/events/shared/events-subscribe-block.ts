/**
 * 订阅入口 —— 页头 / 页脚的 **chrome 块**。
 *
 * 走了两版才到这里，两次都是被真实版式打回来的：
 *
 *   1. 做成 feed 段上的一个开关 → `/events` 默认摆 Rising + Now 两段，
 *      同一个 URL 的订阅链接**渲染两次**；feed 段还能摆到营销首页上，
 *      那里冒出一个全站 RSS 链接完全脱离上下文。
 *   2. 做成独立的页面段 → 位置对了，但**模板页早就快照落库**，
 *      改预设对已存在的站点不生效：租户在编辑器里根本找不到它。
 *
 * 根因一直是同一个：订阅**不是页面内容**，它是站点级的常驻入口——
 * 和语言切换、购物车入口同一类东西。那正是 chrome 块存在的理由：
 * 站点级、只有一份、在「站点外观 → 页头 / 页脚」里配置。
 *
 * `singleton` 是必须的：一个站点只该有一个订阅入口。
 */

import { EVENTS_ENTITLEMENT } from "./entitlements.js";

import { chromeSlotSettings } from "@rewindom/builtin/marketing/shared/sections/_common/chrome-blocks.js";

import type { BlockDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const EVENTS_SUBSCRIBE_BLOCK_TYPE = "events.subscribe-link";

export const eventsSubscribeBlock: BlockDefinition = {
  type: EVENTS_SUBSCRIBE_BLOCK_TYPE,
  label: "events:section.subscribeLink.label",
  singleton: true,
  entitlement: EVENTS_ENTITLEMENT.key,
  settings: [
    {
      type: "text",
      id: "label",
      label: "events:section.subscribe.linkLabel",
      default: "events:site.subscribe",
      required: true,
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
      label: "events:section.subscribeLink.iconOnly",
      default: false,
      info: "events:section.subscribeLink.iconOnlyInfo",
    },
    // 默认落在页脚：订阅是常驻但次要的入口，不该和主导航抢位置
    ...chromeSlotSettings({ align: "end", mobile: "menu" }),
  ],
};

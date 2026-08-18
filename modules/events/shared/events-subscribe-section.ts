/**
 * 订阅入口 —— **页面段**。
 *
 * 与 `events.subscribe-link`（页头 / 页脚的 chrome 块）是两个落点，不是重复：
 *
 * | 落点 | 什么时候用 |
 * | --- | --- |
 * | chrome 块 | 站点级常驻入口，全站每页都有，可只显示图标 |
 * | 页面段 | 摆在正文流里，可以带一句说明（「不需要注册账号」这种话页脚放不下） |
 *
 * 与 shop 同形：`shop.cart-link` 是 chrome 块，`shop.cart` 是段。
 *
 * 不限 `page_kinds`：订阅入口摆在任何页面上都成立——它自己会按上下文挑地址。
 */

import { EVENTS_ENTITLEMENT } from "./entitlements.js";

import { layoutSettings } from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const EVENTS_SUBSCRIBE_SECTION_TYPE = "events.subscribe";

export const eventsSubscribeSection: SectionDefinition = {
  type: EVENTS_SUBSCRIBE_SECTION_TYPE,
  label: "events:section.subscribe.label",
  placements: ["page"],
  entitlement: EVENTS_ENTITLEMENT.key,
  settings: [
    { type: "header", content: "editor.group.content" },
    {
      type: "text",
      id: "label",
      label: "events:section.subscribe.linkLabel",
      default: "events:site.subscribe",
      required: true,
    },
    {
      type: "text",
      id: "hint",
      label: "events:section.subscribe.hint",
      default: "events:site.subscribeHint",
    },
    ...layoutSettings(),
  ],
};

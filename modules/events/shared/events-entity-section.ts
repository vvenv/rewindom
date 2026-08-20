/**
 * 公开实体段 —— 只落在 `/events/entities/:slug` 那张模板页上。
 *
 * 实体页存在的理由是**时间尺度**：事件 24h 后就凉，实体不会。
 * 它是稳定的聚合面，值得爬虫反复回访，也是「关注一个实体」的落点（下一期）。
 *
 * 版面只有两块，分在两段上：这是谁（首屏 `events.entity-hero`：名字 + 类型 + 累计档案）
 * → 它涉及的事件（本段，按最近活动降序）。
 * 不做「相关实体」——那要另一套共现数据，且很容易变成一堆噪声链接。
 */

import { EVENTS_ENTITLEMENT } from "./entitlements.js";

import { layoutSettings } from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const EVENTS_ENTITY_SECTION_TYPE = "events.entity";
export const EVENTS_ENTITY_PAGE_KIND = "events_entity";

export const eventsEntitySection: SectionDefinition = {
  type: EVENTS_ENTITY_SECTION_TYPE,
  label: "events:section.entity.label",
  placements: ["page"],
  entitlement: EVENTS_ENTITLEMENT.key,
  // 摆到普通页面上没有「当前实体」可渲染，只会是一块空白
  page_kinds: [EVENTS_ENTITY_PAGE_KIND],
  settings: [
    { type: "header", content: "editor.group.content" },
    /*
     * 默认留空 = 不画标题。这一页只有这一个列表，首屏又刚说完这是谁，
     * 再挂一行「相关事件」只是多拦一道眼睛（而且它们并非「相关」，就是它的事件）。
     */
    {
      type: "text",
      id: "events_label",
      label: "events:section.entity.eventsLabel",
      info: "events:section.entity.eventsLabelInfo",
    },
    {
      type: "checkbox",
      id: "show_sources",
      label: "events:section.entity.showSources",
      default: true,
    },
    {
      type: "text",
      id: "empty_text",
      label: "events:section.entity.emptyText",
      default: "events:entity.empty",
    },
    ...layoutSettings(),
  ],
};

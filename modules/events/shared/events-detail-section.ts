/**
 * 公开事件详情段 —— 只落在 `/events/:slug` 那张模板页上。
 *
 * 版面顺序即产品主张（MVP §15）：发生了什么 → 时间线 → 来源。先给结论，再给过程，
 * 最后把证据摊开让访客自己核对。它不做「相关事件」——那是二期，且需要另一套数据。
 */

import { EVENTS_ENTITLEMENT } from "./entitlements.js";

import { layoutSettings } from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const EVENTS_DETAIL_SECTION_TYPE = "events.detail";
export const EVENTS_DETAIL_PAGE_KIND = "events_detail";

export const eventsDetailSection: SectionDefinition = {
  type: EVENTS_DETAIL_SECTION_TYPE,
  label: "events:section.detail.label",
  placements: ["page"],
  entitlement: EVENTS_ENTITLEMENT.key,
  // 摆到普通页面上没有「当前事件」可渲染，只会是一块空白
  page_kinds: [EVENTS_DETAIL_PAGE_KIND],
  settings: [
    { type: "header", content: "editor.group.content" },
    {
      type: "text",
      id: "summary_label",
      label: "events:section.detail.summaryLabel",
      default: "events:detail.whatHappened",
    },
    {
      type: "checkbox",
      id: "show_timeline",
      label: "events:section.detail.showTimeline",
      default: true,
    },
    {
      type: "text",
      id: "timeline_label",
      label: "events:section.detail.timelineLabel",
      default: "events:detail.timeline",
    },
    {
      type: "checkbox",
      id: "show_sources",
      label: "events:section.detail.showSources",
      default: true,
      info: "events:section.detail.showSourcesInfo",
    },
    {
      type: "text",
      id: "sources_label",
      label: "events:section.detail.sourcesLabel",
      default: "events:detail.sources",
    },
    {
      type: "text",
      id: "back_label",
      label: "events:section.detail.backLabel",
      default: "events:detail.back",
    },
    { type: "header", content: "editor.group.layout", group: "layout" },
    ...layoutSettings({ padding_top: 48, padding_bottom: 64 }),
  ],
};

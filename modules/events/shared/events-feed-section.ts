/**
 * 「正在发生什么」区块 —— 可摆在官网任意页面上。
 *
 * 段的三种取数口径就是 MVP §14 的三段：Rising（正在变化）、Now（正在发生）、
 * Today（今天全部）。刻意**不做**「各平台热榜并排」那种版式——那会把产品退回聚合器
 *（MVP §13）。卡片上出现的是事件，来源只作为证据出现在下面一行小字里。
 */

import { EVENTS_ENTITLEMENT } from "./entitlements.js";
import { EVENT_TOPICS } from "./events.js";

import {
  headingSettings,
  layoutSettings,
} from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const EVENTS_FEED_SECTION_TYPE = "events.feed";

/** 「全部主题」在 setting 里用空串表示，与 marketing 的 select 取值口径一致。 */
export const EVENTS_FEED_TOPIC_ALL = "";

export const EVENTS_FEED_SOURCES = ["rising", "now", "today"] as const;

export const eventsFeedSection: SectionDefinition = {
  type: EVENTS_FEED_SECTION_TYPE,
  label: "events:section.feed.label",
  placements: ["page"],
  entitlement: EVENTS_ENTITLEMENT.key,
  settings: [
    ...headingSettings({
      headingDefault: "events:site.feed.heading",
      subheadingDefault: "events:site.feed.subheading",
    }),
    { type: "header", content: "editor.group.content" },
    {
      type: "select",
      id: "source",
      label: "events:section.feed.source",
      default: "rising",
      info: "events:section.feed.sourceInfo",
      options: [
        { value: "rising", label: "events:sections.rising" },
        { value: "now", label: "events:sections.now" },
        { value: "today", label: "events:sections.today" },
      ],
    },
    {
      type: "select",
      id: "topic",
      label: "events:section.feed.topic",
      default: EVENTS_FEED_TOPIC_ALL,
      options: [
        { value: EVENTS_FEED_TOPIC_ALL, label: "events:filters.allTopics" },
        ...EVENT_TOPICS.map((topic) => ({
          value: topic,
          label: `events:topic.${topic}`,
        })),
      ],
    },
    {
      type: "range",
      id: "limit",
      label: "events:section.feed.limit",
      default: 6,
      min: 1,
      max: 12,
      step: 1,
    },
    {
      type: "checkbox",
      id: "show_sources",
      label: "events:section.feed.showSources",
      default: true,
      info: "events:section.feed.showSourcesInfo",
    },
    {
      type: "text",
      id: "empty_text",
      label: "events:section.feed.emptyText",
      default: "events:site.feed.empty",
    },
    {
      type: "text",
      id: "more_label",
      label: "events:section.feed.moreLabel",
      default: "events:site.feed.more",
    },
    { type: "header", content: "editor.group.layout", group: "layout" },
    ...layoutSettings({ padding_top: 48, padding_bottom: 48 }),
  ],
};

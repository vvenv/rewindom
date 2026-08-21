/**
 * 「正在发生什么」列表段。
 *
 * Rising / Now 是两个段类型，不是一个段里的 source 下拉——添加区块时选的就是产品切面，
 * 标题默认值才能写在各自的 setting 上（site-section：1:1 模板段用 ns:key default）。
 *
 * `events.feed` 是存量页上的旧 type：仍登记、仍渲染，但不进「添加区块」。
 */

import { EVENTS_ENTITLEMENT } from "./entitlements.js";
import { EVENT_TOPICS, type EventFeedTab } from "./events.js";

import {
  headingSettings,
  layoutSettings,
} from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SettingDef } from "@rewindom/builtin/marketing/shared/section-settings.js";
import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const EVENTS_RISING_SECTION_TYPE = "events.rising";
export const EVENTS_NOW_SECTION_TYPE = "events.now";
/** 有证据的进展：Now 同序里筛厚卡，不是第三把尺子。 */
export const EVENTS_BRIEFING_SECTION_TYPE = "events.briefing";
/** 存量页上的旧 type。新页面不要再写它。 */
export const EVENTS_FEED_SECTION_TYPE = "events.feed";

export const EVENTS_FEED_SECTION_TYPES = [
  EVENTS_RISING_SECTION_TYPE,
  EVENTS_NOW_SECTION_TYPE,
  EVENTS_FEED_SECTION_TYPE,
] as const;

/** 会触发拉 feed 的段：Rising / Now / 存量 feed / 简报。 */
export const EVENTS_FEED_CONTEXT_TYPES = [
  ...EVENTS_FEED_SECTION_TYPES,
  EVENTS_BRIEFING_SECTION_TYPE,
] as const;

/** 「全部主题」在 setting 里用空串表示，与 marketing 的 select 取值口径一致。 */
export const EVENTS_FEED_TOPIC_ALL = "";

export function eventFeedSectionType(tab: EventFeedTab): string {
  return tab === "now" ? EVENTS_NOW_SECTION_TYPE : EVENTS_RISING_SECTION_TYPE;
}

function eventFeedContentSettings(limitDefault: number): SettingDef[] {
  return [
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
      default: limitDefault,
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
  ];
}

function eventFeedSection(tab: EventFeedTab): SectionDefinition {
  return {
    type: eventFeedSectionType(tab),
    label: `events:sections.${tab}`,
    placements: ["page"],
    entitlement: EVENTS_ENTITLEMENT.key,
    settings: [
      ...headingSettings({
        headingDefault: `events:sections.${tab}`,
        subheadingDefault: `events:sections.${tab}Hint`,
      }),
      { type: "header", content: "editor.group.content" },
      ...eventFeedContentSettings(tab === "rising" ? 4 : 8),
    ],
  };
}

export const eventsRisingSection = eventFeedSection("rising");
export const eventsNowSection = eventFeedSection("now");

/**
 * 「有证据的进展」：Now 同序的更大一池里只留厚卡。
 *
 * 空则整段不渲染，所以设置里不放 empty_text——画「暂无精选」比没有这段更糟。
 * 「查看全部」链到 Now 列表，不新造 ?source=briefing。
 */
export const eventsBriefingSection: SectionDefinition = {
  type: EVENTS_BRIEFING_SECTION_TYPE,
  label: "events:sections.briefing",
  placements: ["page"],
  entitlement: EVENTS_ENTITLEMENT.key,
  settings: [
    ...headingSettings({
      headingDefault: "events:sections.briefing",
      subheadingDefault: "events:sections.briefingHint",
    }),
    { type: "header", content: "editor.group.content" },
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
      default: 4,
      min: 1,
      max: 8,
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
      id: "more_label",
      label: "events:section.feed.moreLabel",
      default: "events:site.feed.more",
    },
    { type: "header", content: "editor.group.layout", group: "layout" },
    ...layoutSettings({ padding_top: 48, padding_bottom: 48 }),
  ],
};

/**
 * 存量 `events.feed`：库里的页面还带着 source 下拉。
 * `placements` 为空 = 不进添加菜单，解析与渲染仍认这个 type。
 */
export const eventsFeedSection: SectionDefinition = {
  type: EVENTS_FEED_SECTION_TYPE,
  label: "events:section.feed.label",
  placements: [],
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
      ],
    },
    ...eventFeedContentSettings(6),
  ],
};

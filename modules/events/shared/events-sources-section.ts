/**
 * 采集源列表 —— 方法论文，不是首页贴片。
 *
 * 列本站正在采集的出版方，外链是首页不是 RSS。租户把它插进自定义「关于」页，
 * 再把该页用内置 pages / link 挂到页头或页脚。不另做导航源，也不做固定 /sources 页。
 */

import { EVENTS_ENTITLEMENT, EVENTS_SECTION_GROUP } from "./entitlements.js";

import {
  headingSettings,
  layoutSettings,
} from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const EVENTS_SOURCES_SECTION_TYPE = "events.sources";

export const eventsSourcesSection: SectionDefinition = {
  type: EVENTS_SOURCES_SECTION_TYPE,
  label: "events:section.sources.label",
  group: EVENTS_SECTION_GROUP,
  placements: ["page"],
  entitlement: EVENTS_ENTITLEMENT.key,
  settings: [
    ...headingSettings({
      headingDefault: "events:sections.sources",
      subheadingDefault: "events:sections.sourcesHint",
    }),
    { type: "header", content: "editor.group.content" },
    {
      type: "checkbox",
      id: "group_by_topic",
      label: "events:section.sources.groupByTopic",
      default: true,
    },
    {
      type: "text",
      id: "empty_text",
      label: "events:section.sources.emptyText",
      default: "events:site.sources.empty",
    },
    { type: "header", content: "editor.group.layout", group: "layout" },
    ...layoutSettings({ padding_top: 32, padding_bottom: 32 }),
  ],
};

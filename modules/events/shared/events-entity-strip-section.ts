/**
 * 近期实体胶囊条 —— 可摆在任意页面上。
 *
 * 枢纽 `events.entity-index` 是一张按类型分组的完整清单，只活在 `/entities`。
 * 这一段是同一批实体的 **Top N**，字号一律、用数字角标表示权重，默认出现在
 * 升温 / 正在发生下面——让首页也链到实体页，而不另做一朵词云。
 */

import { EVENTS_ENTITLEMENT } from "./entitlements.js";

import {
  headingSettings,
  layoutSettings,
} from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const EVENTS_ENTITY_STRIP_SECTION_TYPE = "events.entity-strip";

export const EVENTS_ENTITY_STRIP_LIMIT_DEFAULT = 24;
export const EVENTS_ENTITY_STRIP_LIMIT_MIN = 8;
export const EVENTS_ENTITY_STRIP_LIMIT_MAX = 48;

export const eventsEntityStripSection: SectionDefinition = {
  type: EVENTS_ENTITY_STRIP_SECTION_TYPE,
  label: "events:section.entityStrip.label",
  placements: ["page"],
  entitlement: EVENTS_ENTITLEMENT.key,
  settings: [
    ...headingSettings({
      headingDefault: "events:sections.entities",
      subheadingDefault: "events:sections.entitiesHint",
    }),
    { type: "header", content: "editor.group.content" },
    {
      type: "range",
      id: "limit",
      label: "events:section.entityStrip.limit",
      default: EVENTS_ENTITY_STRIP_LIMIT_DEFAULT,
      min: EVENTS_ENTITY_STRIP_LIMIT_MIN,
      max: EVENTS_ENTITY_STRIP_LIMIT_MAX,
      step: 1,
    },
    {
      type: "checkbox",
      id: "show_counts",
      label: "events:section.entityStrip.showCounts",
      default: true,
    },
    {
      type: "text",
      id: "more_label",
      label: "events:section.entityStrip.moreLabel",
      default: "events:site.entityStrip.more",
    },
    { type: "header", content: "editor.group.layout", group: "layout" },
    ...layoutSettings({ padding_top: 32, padding_bottom: 32 }),
  ],
};

/**
 * 实体枢纽段 —— 只落在 `/events/entities` 那张模板页上。
 *
 * 它解决的是**孤儿页**：实体详情页此前只在 sitemap 里出现，站内一条链接都没有。
 * 枢纽给爬虫一条能一次爬完的路，也给人一个「这个站在追哪些公司 / 产品」的入口。
 *
 * 版面只有一块：按类型分组的实体链接。不做搜索、不做分页——
 * 收的是最近还有事件的那一批，一屏读得完；真的多到读不完再谈分页。
 */

import { EVENTS_ENTITLEMENT } from "./entitlements.js";

import { layoutSettings } from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const EVENTS_ENTITY_INDEX_SECTION_TYPE = "events.entity_index";
export const EVENTS_ENTITY_INDEX_PAGE_KIND = "events_entity_index";

export const eventsEntityIndexSection: SectionDefinition = {
  type: EVENTS_ENTITY_INDEX_SECTION_TYPE,
  label: "events:section.entityIndex.label",
  placements: ["page"],
  entitlement: EVENTS_ENTITLEMENT.key,
  // 摆到普通页面上没有实体清单可渲染，只会是一块空白
  page_kinds: [EVENTS_ENTITY_INDEX_PAGE_KIND],
  settings: [
    { type: "header", content: "editor.group.content" },
    {
      type: "checkbox",
      id: "show_counts",
      label: "events:section.entityIndex.showCounts",
      default: true,
    },
    {
      type: "text",
      id: "empty_text",
      label: "events:section.entityIndex.emptyText",
      default: "events:entityIndex.empty",
    },
    ...layoutSettings(),
  ],
};

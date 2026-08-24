import { EVENTS_ENTITY_STRIP_SECTION_TYPE } from "./events-entity-strip-section.js";
import { EVENTS_FEED_CONTEXT_TYPES } from "./events-feed-section.js";
import { EVENTS_LIVE_SECTION_TYPE } from "./events-live-section.js";
import { EVENTS_NAV_SOURCES } from "./nav-sources.js";
import { EVENTS_SOURCES_SECTION_TYPE } from "./events-sources-section.js";

/**
 * 段 / 导航源：通用 SSR 按这组 type 按需取事件数据。
 *
 * 事件自有模板页的跳过清单是 {@link EVENTS_PATH_SKIP_SECTION_TYPES}——那几张页
 * 由 path handler 直接把 feed / 实体带进来了，provider 再查一遍就是每张页多打
 * 一轮同样的库（见 `marketing/server/page-contributed.ts` 的 `skipSectionTypes`）。
 * **不含**采集源列表：关于页上的方法论文不能被事件模板的 overlay 盖掉。
 */
export const EVENTS_PATH_SKIP_SECTION_TYPES = [
  ...EVENTS_FEED_CONTEXT_TYPES,
  EVENTS_ENTITY_STRIP_SECTION_TYPE,
  EVENTS_LIVE_SECTION_TYPE,
  ...EVENTS_NAV_SOURCES,
] as const;

export const EVENTS_CONTEXT_SECTION_TYPES = [
  ...EVENTS_PATH_SKIP_SECTION_TYPES,
  EVENTS_SOURCES_SECTION_TYPE,
] as const;

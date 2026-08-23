import { EVENTS_ENTITY_STRIP_SECTION_TYPE } from "./events-entity-strip-section.js";
import { EVENTS_FEED_CONTEXT_TYPES } from "./events-feed-section.js";
import { EVENTS_HERO_SECTION_TYPE } from "./events-hero-section.js";
import { EVENTS_NAV_SOURCES } from "./nav-sources.js";

/**
 * 段 / 导航源：通用 SSR 按这组 type 按需取事件数据。
 *
 * 同时是**事件自有模板页的跳过清单**——那几张页由 path handler 直接把 feed / 实体
 * 带进来了，provider 再查一遍就是每张页多打一轮同样的库（见
 * `marketing/server/page-contributed.ts` 的 `skipSectionTypes`）。
 * 跳过之后主题格由 `withEventsNavTopics` 自己补，与以前一样。
 */
export const EVENTS_CONTEXT_SECTION_TYPES = [
  ...EVENTS_FEED_CONTEXT_TYPES,
  EVENTS_ENTITY_STRIP_SECTION_TYPE,
  EVENTS_HERO_SECTION_TYPE,
  ...EVENTS_NAV_SOURCES,
] as const;

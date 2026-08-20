/**
 * 实体页专用首屏。
 *
 * 和升温 / 正在发生同一条理由：添加区块时选的就是产品切面，默认值必须写在
 * 这一段自己的 setting 上。若复用 `events.hero`，菜单里只有「首屏」，点下去
 * 拿到的是首页那句产品主张。
 *
 * markup 与 `events.hero` 同一份渲染器；`page_kinds` 钉在实体模板上——摆到
 * 别的页面没有「当前实体」，`{entity}` 是空的。
 */

import { EVENTS_ENTITLEMENT } from "./entitlements.js";
import { EVENTS_ENTITY_PAGE_KIND } from "./events-entity-section.js";
import { eventsHeroSettings } from "./events-hero-section.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const EVENTS_ENTITY_HERO_SECTION_TYPE = "events.entity-hero";

export const eventsEntityHeroSection: SectionDefinition = {
  type: EVENTS_ENTITY_HERO_SECTION_TYPE,
  label: "events:section.entityHero.label",
  placements: ["page"],
  entitlement: EVENTS_ENTITLEMENT.key,
  page_kinds: [EVENTS_ENTITY_PAGE_KIND],
  settings: eventsHeroSettings({
    eyebrow: "events:site.hero.entityEyebrow",
    headline: "events:site.hero.entityHeadline",
    subhead: "events:site.hero.entitySubhead",
    showStatsDefault: false,
  }),
};

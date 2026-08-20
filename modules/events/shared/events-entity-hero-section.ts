/**
 * 实体页专用首屏。
 *
 * 和升温 / 正在发生同一条理由：添加区块时选的就是产品切面，默认值必须写在
 * 这一段自己的 setting 上。若复用 `events.hero`，菜单里只有「首屏」，点下去
 * 拿到的是首页那句产品主张。
 *
 * markup 与 `events.hero` 同一份渲染器；`page_kinds` 钉在实体模板上——摆到
 * 别的页面没有「当前实体」，`{entity}` 是空的。
 *
 * 累计档案（近 90 天几件事、几次故障）也画在这一段：名字下面紧跟着事实，才是
 * 一张实体名片。留在正文段里它会落到下一个色块的顶上，看着像上一段的残留。
 * 首页 / 专题那一段不长这个开关（`profile: true` 只给这里）。
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
    profile: true,
    paddingY: { top: 56, bottom: 24 },
  }),
};

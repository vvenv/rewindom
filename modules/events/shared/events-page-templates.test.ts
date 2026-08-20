import { beforeAll, describe, expect, it } from "vitest";

import { EVENTS_DETAIL_SECTION_TYPE } from "./events-detail-section.js";
import {
  EVENTS_NOW_SECTION_TYPE,
  EVENTS_RISING_SECTION_TYPE,
} from "./events-feed-section.js";
import { EVENTS_HERO_SECTION_TYPE } from "./events-hero-section.js";
import { EVENTS_ENTITY_SECTION_TYPE } from "./events-entity-section.js";
import { EVENTS_ENTITY_STRIP_SECTION_TYPE } from "./events-entity-strip-section.js";
import {
  EVENTS_DETAIL_TEMPLATE_PRESET,
  EVENTS_ENTITY_TEMPLATE_PRESET,
  EVENTS_HOME_LAYOUT_KEY,
  EVENTS_HOME_LAYOUT_PRESET,
  EVENTS_PAGE_TEMPLATE_GROUP,
  EVENTS_TOPIC_PAGE_KIND,
  EVENTS_TOPIC_TEMPLATE_PRESET,
  eventsListingPreset,
  registerEventsPageTemplates,
} from "./events-page-templates.js";
import { EVENTS_FEED_HREF_TEMPLATE } from "./events-section-context.js";

import { getHomeLayout } from "@rewindom/builtin/marketing/shared/home-layouts.js";
import {
  HOME_PAGE_KIND,
  getPageTemplateKind,
} from "@rewindom/builtin/marketing/shared/page-templates.js";

describe("registerEventsPageTemplates", () => {
  beforeAll(() => {
    registerEventsPageTemplates();
  });

  it("首页版式是首屏、升温、实体条与正在发生，因此不能声明「有且仅有一段」必备段", () => {
    expect(
      EVENTS_HOME_LAYOUT_PRESET.sections.map((section) => section.type),
    ).toEqual([
      EVENTS_HERO_SECTION_TYPE,
      EVENTS_RISING_SECTION_TYPE,
      EVENTS_ENTITY_STRIP_SECTION_TYPE,
      EVENTS_NOW_SECTION_TYPE,
    ]);
    expect(EVENTS_HOME_LAYOUT_PRESET.sections[0]).toEqual(
      expect.objectContaining({
        type: EVENTS_HERO_SECTION_TYPE,
        text: expect.objectContaining({
          headline: "events:site.hero.headline",
        }),
        raw: expect.objectContaining({
          secondary_href: EVENTS_FEED_HREF_TEMPLATE,
        }),
      }),
    );
  });

  it("专题枢纽是另一张模板：首屏带 {topic}，其后与首页同构", () => {
    expect(
      EVENTS_TOPIC_TEMPLATE_PRESET.sections.map((section) => section.type),
    ).toEqual([
      EVENTS_HERO_SECTION_TYPE,
      EVENTS_RISING_SECTION_TYPE,
      EVENTS_ENTITY_STRIP_SECTION_TYPE,
      EVENTS_NOW_SECTION_TYPE,
    ]);
    expect(EVENTS_TOPIC_TEMPLATE_PRESET.sections[0]).toEqual(
      expect.objectContaining({
        type: EVENTS_HERO_SECTION_TYPE,
        text: expect.objectContaining({
          headline: "events:site.hero.topicHeadline",
        }),
        raw: expect.objectContaining({
          secondary_href: EVENTS_FEED_HREF_TEMPLATE,
        }),
      }),
    );
    expect(getPageTemplateKind(EVENTS_TOPIC_PAGE_KIND)?.path).toBe(
      "/topics/:slug",
    );
    expect(getPageTemplateKind(EVENTS_TOPIC_PAGE_KIND)?.interpolation_tokens).toEqual(
      ["topic", "topic_slug", "feed"],
    );
    expect(getPageTemplateKind(EVENTS_TOPIC_PAGE_KIND)?.required_section).toBe(
      null,
    );
    expect(getPageTemplateKind(EVENTS_TOPIC_PAGE_KIND)?.group).toBe(
      EVENTS_PAGE_TEMPLATE_GROUP,
    );
  });

  it("详情页有且仅有一段详情正文，钉成必备段", () => {
    expect(
      EVENTS_DETAIL_TEMPLATE_PRESET.sections.map((section) => section.type),
    ).toEqual([EVENTS_DETAIL_SECTION_TYPE]);
    expect(getPageTemplateKind("events_detail")?.required_section).toBe(
      EVENTS_DETAIL_SECTION_TYPE,
    );
    expect(getPageTemplateKind("events_detail")?.path).toBe("/events/:slug");
    expect(getPageTemplateKind("events_detail")?.interpolation_tokens).toEqual([
      "event",
      "headline",
      "topic",
      "topic_slug",
      "feed",
    ]);
  });

  it("实体页是专用首屏加正文：首屏带 {entity}，关掉雷达计数", () => {
    expect(
      EVENTS_ENTITY_TEMPLATE_PRESET.sections.map((section) => section.type),
    ).toEqual([EVENTS_HERO_SECTION_TYPE, EVENTS_ENTITY_SECTION_TYPE]);
    expect(EVENTS_ENTITY_TEMPLATE_PRESET.sections[0]).toEqual(
      expect.objectContaining({
        type: EVENTS_HERO_SECTION_TYPE,
        text: expect.objectContaining({
          eyebrow: "events:site.hero.entityEyebrow",
          headline: "events:site.hero.entityHeadline",
          subhead: "events:site.hero.entitySubhead",
        }),
        raw: expect.objectContaining({
          secondary_href: EVENTS_FEED_HREF_TEMPLATE,
          show_stats: false,
        }),
      }),
    );
    expect(getPageTemplateKind("events_entity")?.required_section).toBe(
      EVENTS_ENTITY_SECTION_TYPE,
    );
    expect(getPageTemplateKind("events_entity")?.path).toBe("/entities/:slug");
    expect(getPageTemplateKind("events_entity")?.interpolation_tokens).toEqual([
      "entity",
      "entity_kind",
      "feed",
    ]);
  });

  it("查询列表只摆与 source 匹配的一段，kind 跟着有没有 topic 走", () => {
    const preset = eventsListingPreset("now", "ai");
    expect(preset.kind).toBe(EVENTS_TOPIC_PAGE_KIND);
    expect(preset.sections).toEqual([
      expect.objectContaining({
        type: EVENTS_NOW_SECTION_TYPE,
        raw: expect.objectContaining({ topic: "ai" }),
      }),
    ]);
    expect(eventsListingPreset("rising").kind).toBe(HOME_PAGE_KIND);
  });

  it("贡献一套站点首页版式，不声明 rootPrefix", () => {
    const layout = getHomeLayout(EVENTS_HOME_LAYOUT_KEY);
    expect(layout?.entitlement).toBe("events");
    expect(layout?.group).toBe(EVENTS_PAGE_TEMPLATE_GROUP);
    expect(layout?.rootPrefix).toBeUndefined();
    expect(layout?.preset).toBe(EVENTS_HOME_LAYOUT_PRESET);
  });
});

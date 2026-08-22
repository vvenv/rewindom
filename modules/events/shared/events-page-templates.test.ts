import { beforeAll, describe, expect, it } from "vitest";

import { EVENTS_DETAIL_SECTION_TYPE } from "./events-detail-section.js";
import { EVENTS_ENTITLEMENT } from "./entitlements.js";
import {
  EVENTS_NOW_SECTION_TYPE,
  EVENTS_RISING_SECTION_TYPE,
} from "./events-feed-section.js";
import { EVENTS_HERO_SECTION_TYPE } from "./events-hero-section.js";
import { EVENTS_ENTITY_HERO_SECTION_TYPE } from "./events-entity-hero-section.js";
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
import {
  EVENTS_FEED_HREF_TEMPLATE,
  emptyEventsContext,
  eventsInterpolationValues,
} from "./events-section-context.js";

import { getHomeLayout } from "@rewindom/builtin/marketing/shared/home-layouts.js";
import { interpolationTokensFor } from "@rewindom/builtin/marketing/shared/interpolation-tokens.js";
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
  });

  it("实体页是专用首屏加正文：添加区块里是 events.entity-hero，不是首页那一段", () => {
    expect(
      EVENTS_ENTITY_TEMPLATE_PRESET.sections.map((section) => section.type),
    ).toEqual([EVENTS_ENTITY_HERO_SECTION_TYPE, EVENTS_ENTITY_SECTION_TYPE]);
    expect(EVENTS_ENTITY_TEMPLATE_PRESET.sections[0]).toEqual({
      type: EVENTS_ENTITY_HERO_SECTION_TYPE,
    });
    expect(getPageTemplateKind("events_entity")?.required_section).toBe(
      EVENTS_ENTITY_SECTION_TYPE,
    );
    expect(getPageTemplateKind("events_entity")?.path).toBe("/entities/:slug");
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

/*
 * 「登记了哪些 token」与「实际填了哪些」是两份清单，靠这条钉在一起。
 *
 * 漂移不会报错、只会悄悄少一项：实体枢纽当初一个 token 都没声明，`{feed}` 在那张
 * 页面上明明可用，编辑器却从来不列，租户无从知道能写。反过来，声明了却没人填的
 * token 会让租户写下一个永远替不掉的花括号。
 */
describe("占位符登记与填值一一对应", () => {
  const ENTITLEMENTS = new Set([EVENTS_ENTITLEMENT.key]);
  const ALL_KINDS = [
    HOME_PAGE_KIND,
    EVENTS_TOPIC_PAGE_KIND,
    "events_detail",
    "events_entity",
    "events_entity_index",
  ];

  it("events 填的每个 key 都登记过，登记的每个 key 也都有人填", () => {
    const filled = new Set(
      Object.keys(eventsInterpolationValues(emptyEventsContext())),
    );
    const registered = new Set(
      ALL_KINDS.flatMap((pageKind) =>
        interpolationTokensFor({ pageKind, entitlements: ENTITLEMENTS })
          .filter((token) => token.entitlement === EVENTS_ENTITLEMENT.key)
          .map((token) => token.key),
      ),
    );
    expect([...registered].sort()).toEqual([...filled].sort());
  });

  it("{feed} 在五张页面上都列得出——它当初正是被抄漏的那一个", () => {
    for (const pageKind of ALL_KINDS) {
      expect(
        interpolationTokensFor({ pageKind, entitlements: ENTITLEMENTS }).map(
          (token) => token.key,
        ),
      ).toContain("feed");
    }
  });

  it("没开通事件雷达的站点一个都不列", () => {
    for (const pageKind of ALL_KINDS) {
      expect(
        interpolationTokensFor({ pageKind }).every(
          (token) => token.entitlement === undefined,
        ),
      ).toBe(true);
    }
  });
});

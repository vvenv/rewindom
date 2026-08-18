import { beforeAll, describe, expect, it } from "vitest";

import { EVENTS_DETAIL_SECTION_TYPE } from "./events-detail-section.js";
import {
  EVENTS_NOW_SECTION_TYPE,
  EVENTS_RISING_SECTION_TYPE,
} from "./events-feed-section.js";
import { EVENTS_SUBSCRIBE_SECTION_TYPE } from "./events-subscribe-section.js";
import {
  EVENTS_DETAIL_TEMPLATE_PRESET,
  EVENTS_HOME_LAYOUT_KEY,
  EVENTS_HOME_LAYOUT_PRESET,
  EVENTS_INDEX_PAGE_KIND,
  EVENTS_INDEX_TEMPLATE_PRESET,
  EVENTS_PAGE_TEMPLATE_GROUP,
  eventsListingPreset,
  registerEventsPageTemplates,
} from "./events-page-templates.js";

import { getHomeLayout } from "@rewindom/builtin/marketing/shared/home-layouts.js";
import { getPageTemplateKind } from "@rewindom/builtin/marketing/shared/page-templates.js";

describe("registerEventsPageTemplates", () => {
  beforeAll(() => {
    registerEventsPageTemplates();
  });

  it("首页预设是升温、正在发生与订阅三段，因此不能声明「有且仅有一段」必备段", () => {
    expect(
      EVENTS_INDEX_TEMPLATE_PRESET.sections.map((section) => section.type),
    ).toEqual([
      EVENTS_RISING_SECTION_TYPE,
      EVENTS_NOW_SECTION_TYPE,
      EVENTS_SUBSCRIBE_SECTION_TYPE,
    ]);
    expect(getPageTemplateKind(EVENTS_INDEX_PAGE_KIND)?.required_section).toBe(
      null,
    );
    expect(getPageTemplateKind(EVENTS_INDEX_PAGE_KIND)?.group).toBe(
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
  });

  it("查询列表只摆与 source 匹配的一段", () => {
    const preset = eventsListingPreset("now", "ai");
    expect(preset.sections).toEqual([
      expect.objectContaining({
        type: EVENTS_NOW_SECTION_TYPE,
        raw: expect.objectContaining({ topic: "ai" }),
      }),
    ]);
  });

  it("贡献一套站点首页版式，与枢纽同构，未开通不进选择器", () => {
    expect(
      EVENTS_HOME_LAYOUT_PRESET.sections.map((section) => section.type),
    ).toEqual(
      EVENTS_INDEX_TEMPLATE_PRESET.sections.map((section) => section.type),
    );
    const layout = getHomeLayout(EVENTS_HOME_LAYOUT_KEY);
    expect(layout?.entitlement).toBe("events");
    expect(layout?.rootPrefix).toBe("/events");
    expect(layout?.preset).toBe(EVENTS_HOME_LAYOUT_PRESET);
  });
});

import { beforeAll, describe, expect, it } from "vitest";

import { EVENTS_DETAIL_SECTION_TYPE } from "./events-detail-section.js";
import { EVENTS_FEED_SECTION_TYPE } from "./events-feed-section.js";
import {
  EVENTS_DETAIL_TEMPLATE_PRESET,
  EVENTS_INDEX_PAGE_KIND,
  EVENTS_INDEX_TEMPLATE_PRESET,
  EVENTS_PAGE_TEMPLATE_GROUP,
  registerEventsPageTemplates,
} from "./events-page-templates.js";

import { getPageTemplateKind } from "@rewindom/builtin/marketing/shared/page-templates.js";

describe("registerEventsPageTemplates", () => {
  beforeAll(() => {
    registerEventsPageTemplates();
  });

  it("首页预设是三段 feed，因此不能声明「有且仅有一段」必备段", () => {
    expect(
      EVENTS_INDEX_TEMPLATE_PRESET.sections.map((section) => section.type),
    ).toEqual([
      EVENTS_FEED_SECTION_TYPE,
      EVENTS_FEED_SECTION_TYPE,
      EVENTS_FEED_SECTION_TYPE,
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
});

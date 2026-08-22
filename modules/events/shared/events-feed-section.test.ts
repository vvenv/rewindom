import { describe, expect, it } from "vitest";

import {
  EVENTS_FEED_SECTION_TYPE,
  EVENTS_NOW_SECTION_TYPE,
  EVENTS_RISING_SECTION_TYPE,
  eventFeedSectionType,
  eventsFeedSection,
  eventsNowSection,
  eventsRisingSection,
} from "./events-feed-section.js";

function settingDefault(
  def: { settings: readonly Record<string, unknown>[] },
  id: string,
): unknown {
  return def.settings.find((setting) => setting.id === id)?.default;
}

describe("event feed sections", () => {
  it("升温 / 正在发生是两个段类型，标题默认就是对应文案", () => {
    expect(eventsRisingSection.type).toBe(EVENTS_RISING_SECTION_TYPE);
    expect(eventsNowSection.type).toBe(EVENTS_NOW_SECTION_TYPE);
    expect(settingDefault(eventsRisingSection, "heading")).toBe(
      "events:sections.rising",
    );
    expect(settingDefault(eventsRisingSection, "subheading")).toBe(
      "events:sections.risingHint",
    );
    expect(settingDefault(eventsNowSection, "heading")).toBe("events:sections.now");
    expect(settingDefault(eventsNowSection, "subheading")).toBe(
      "events:sections.nowHint",
    );
    expect(settingDefault(eventsRisingSection, "limit")).toBe(4);
    expect(settingDefault(eventsNowSection, "limit")).toBe(8);
  });

  it("存量 events.feed 不进添加菜单", () => {
    expect(eventsFeedSection.type).toBe(EVENTS_FEED_SECTION_TYPE);
    expect(eventsFeedSection.placements).toEqual([]);
  });

  it("查询批次对应到段 type", () => {
    expect(eventFeedSectionType("rising")).toBe(EVENTS_RISING_SECTION_TYPE);
    expect(eventFeedSectionType("now")).toBe(EVENTS_NOW_SECTION_TYPE);
  });
});

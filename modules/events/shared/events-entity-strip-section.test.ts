import { describe, expect, it } from "vitest";

import {
  EVENTS_ENTITY_STRIP_LIMIT_DEFAULT,
  EVENTS_ENTITY_STRIP_SECTION_TYPE,
  eventsEntityStripSection,
} from "./events-entity-strip-section.js";

function settingDefault(
  def: { settings: readonly Record<string, unknown>[] },
  id: string,
): unknown {
  return def.settings.find((setting) => setting.id === id)?.default;
}

describe("eventsEntityStripSection", () => {
  it("可摆任意页，标题默认就是「实体」文案", () => {
    expect(eventsEntityStripSection.type).toBe(EVENTS_ENTITY_STRIP_SECTION_TYPE);
    expect(eventsEntityStripSection.placements).toEqual(["page"]);
    expect(eventsEntityStripSection.page_kinds).toBeUndefined();
    expect(settingDefault(eventsEntityStripSection, "heading")).toBe(
      "events:sections.entities",
    );
    expect(settingDefault(eventsEntityStripSection, "subheading")).toBe(
      "events:sections.entitiesHint",
    );
    expect(settingDefault(eventsEntityStripSection, "limit")).toBe(
      EVENTS_ENTITY_STRIP_LIMIT_DEFAULT,
    );
    expect(settingDefault(eventsEntityStripSection, "more_label")).toBe(
      "events:site.entityStrip.more",
    );
  });
});

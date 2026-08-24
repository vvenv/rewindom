import { describe, expect, it } from "vitest";

import {
  EVENTS_SOURCES_SECTION_TYPE,
  eventsSourcesSection,
} from "./events-sources-section.js";

function settingDefault(
  def: { settings: readonly Record<string, unknown>[] },
  id: string,
): unknown {
  return def.settings.find((setting) => setting.id === id)?.default;
}

describe("eventsSourcesSection", () => {
  it("可摆任意页，不钉死 page_kinds——关于页是租户自建的 CMS 页", () => {
    expect(eventsSourcesSection.type).toBe(EVENTS_SOURCES_SECTION_TYPE);
    expect(eventsSourcesSection.placements).toEqual(["page"]);
    expect(eventsSourcesSection.page_kinds).toBeUndefined();
    expect(settingDefault(eventsSourcesSection, "heading")).toBe(
      "events:sections.sources",
    );
    expect(settingDefault(eventsSourcesSection, "subheading")).toBe(
      "events:sections.sourcesHint",
    );
    expect(settingDefault(eventsSourcesSection, "group_by_topic")).toBe(true);
    expect(settingDefault(eventsSourcesSection, "empty_text")).toBe(
      "events:site.sources.empty",
    );
  });
});

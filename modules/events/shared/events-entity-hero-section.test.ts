import { describe, expect, it } from "vitest";

import { EVENTS_ENTITY_PAGE_KIND } from "./events-entity-section.js";
import {
  EVENTS_ENTITY_HERO_SECTION_TYPE,
  eventsEntityHeroSection,
} from "./events-entity-hero-section.js";

function settingDefault(
  def: { settings: readonly Record<string, unknown>[] },
  id: string,
): unknown {
  return def.settings.find((setting) => setting.id === id)?.default;
}

describe("eventsEntityHeroSection", () => {
  it("只进实体模板的添加区块，默认文案就是 {entity} 那一套", () => {
    expect(eventsEntityHeroSection.type).toBe(EVENTS_ENTITY_HERO_SECTION_TYPE);
    expect(eventsEntityHeroSection.placements).toEqual(["page"]);
    expect(eventsEntityHeroSection.page_kinds).toEqual([EVENTS_ENTITY_PAGE_KIND]);
    expect(settingDefault(eventsEntityHeroSection, "eyebrow")).toBe(
      "events:site.hero.entityEyebrow",
    );
    expect(settingDefault(eventsEntityHeroSection, "headline")).toBe(
      "events:site.hero.entityHeadline",
    );
    expect(settingDefault(eventsEntityHeroSection, "subhead")).toBe(
      "events:site.hero.entitySubhead",
    );
    expect(settingDefault(eventsEntityHeroSection, "show_stats")).toBe(false);
  });
});

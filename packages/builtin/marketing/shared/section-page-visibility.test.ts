import { describe, expect, it } from "vitest";

import { renderSectionHtml } from "./sections/html.js";
import {
  coercePagePathList,
  createSection,
  getSectionDefinition,
  parseSettingValues,
  VISIBLE_ON_SETTING_ID,
} from "./section-schema.js";
import {
  omitAreaPageVisibilitySettings,
  sectionHiddenOnCurrentPage,
  sectionVisibleOnPage,
} from "./section-page-visibility.js";

describe("coercePagePathList", () => {
  it("keeps logical paths, drops junk, and dedupes trailing slashes", () => {
    expect(
      coercePagePathList(["/about", "/about/", "https://x.test", "//cdn", 1, "/"]),
    ).toEqual(["/about", "/"]);
  });

  it("allows template paths with :params", () => {
    expect(coercePagePathList(["/docs/:slug"])).toEqual(["/docs/:slug"]);
  });
});

describe("sectionVisibleOnPage", () => {
  it("shows unrestricted sections everywhere", () => {
    const band = createSection("band");
    expect(sectionVisibleOnPage(band, "/")).toBe(true);
    expect(sectionVisibleOnPage(band, "/about")).toBe(true);
    expect(sectionVisibleOnPage(band, undefined)).toBe(true);
  });

  it("hides a restricted section on other pages", () => {
    const band = {
      ...createSection("band"),
      settings: { ...createSection("band").settings, visible_on: ["/about"] },
    };
    expect(sectionVisibleOnPage(band, "/about")).toBe(true);
    expect(sectionVisibleOnPage(band, "/about/")).toBe(true);
    expect(sectionVisibleOnPage(band, "/")).toBe(false);
    expect(sectionHiddenOnCurrentPage(band, "/")).toBe(true);
    expect(sectionHiddenOnCurrentPage(band, "/about")).toBe(false);
  });
});

describe("area page visibility schema", () => {
  it("injects visible_on on header/footer-capable sections but not chrome body or page-only types", () => {
    const band = getSectionDefinition("band");
    expect(band.settings.some((d) => "id" in d && d.id === VISIBLE_ON_SETTING_ID)).toBe(
      true,
    );
    expect(
      getSectionDefinition("hero").settings.some(
        (d) => "id" in d && d.id === VISIBLE_ON_SETTING_ID,
      ),
    ).toBe(false);
    expect(
      getSectionDefinition("header").settings.some(
        (d) => "id" in d && d.id === VISIBLE_ON_SETTING_ID,
      ),
    ).toBe(false);
    expect(
      getSectionDefinition("footer").settings.some(
        (d) => "id" in d && d.id === VISIBLE_ON_SETTING_ID,
      ),
    ).toBe(false);
  });

  it("round-trips visible_on through parseSettingValues", () => {
    const defs = getSectionDefinition("badges").settings;
    expect(parseSettingValues(defs, {}).visible_on).toEqual([]);
    expect(
      parseSettingValues(defs, { visible_on: ["/pricing", "nope"] }).visible_on,
    ).toEqual(["/pricing"]);
  });

  it("omits the visibility group for the page-stream settings form", () => {
    const defs = omitAreaPageVisibilitySettings(getSectionDefinition("band").settings);
    expect(defs.some((d) => "id" in d && d.id === VISIBLE_ON_SETTING_ID)).toBe(false);
  });
});

describe("renderSectionHtml page visibility", () => {
  it("skips a restricted band on other pages and renders it on a match", () => {
    const band = {
      ...createSection("band"),
      settings: {
        ...createSection("band").settings,
        headline: "Only about",
        visible_on: ["/about"],
      },
    };
    expect(renderSectionHtml(band, 0, { currentPath: "/" })).toBe("");
    expect(renderSectionHtml(band, 0, { currentPath: "/about" })).toContain(
      "Only about",
    );
  });
});

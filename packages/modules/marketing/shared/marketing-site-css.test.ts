import { describe, expect, it } from "vitest";

import { MARKETING_SITE_CSS } from "./marketing-site-css.js";
import { loadMarketingSiteCss } from "./load-marketing-site-css.js";
import { SECTION_DEFINITIONS } from "./sections/index.js";
import { SECTION_STYLES_BY_TYPE } from "./sections/styles.js";
import type { SectionType } from "./sections/types.js";

describe("marketing-site-css", () => {
  it("exports semantic classes used by SSR and SPA", () => {
    expect(MARKETING_SITE_CSS).toContain(".btn {");
    expect(MARKETING_SITE_CSS).toContain(".sec-band");
    expect(MARKETING_SITE_CSS).toContain(".hero");
    expect(MARKETING_SITE_CSS).toContain(".qa {");
    expect(MARKETING_SITE_CSS).toContain(".plan {");
    expect(MARKETING_SITE_CSS).toContain(".form-grid");
    expect(MARKETING_SITE_CSS).toContain(".marketing-site-root");
    expect(MARKETING_SITE_CSS).toContain(".site-stack");
    expect(MARKETING_SITE_CSS).toContain(".site-main");
    expect(MARKETING_SITE_CSS).not.toContain("@import");
  });

  it("loadMarketingSiteCss returns the same stylesheet", () => {
    expect(loadMarketingSiteCss()).toBe(MARKETING_SITE_CSS);
  });

  it("registers a stylesheet export for every section type", () => {
    const registered = Object.keys(SECTION_DEFINITIONS) as SectionType[];
    for (const type of registered) {
      expect(SECTION_STYLES_BY_TYPE).toHaveProperty(type);
      expect(typeof SECTION_STYLES_BY_TYPE[type]).toBe("string");
    }
    expect(Object.keys(SECTION_STYLES_BY_TYPE).sort()).toEqual(
      registered.slice().sort(),
    );
  });
});

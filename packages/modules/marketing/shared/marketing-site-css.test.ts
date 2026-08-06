import { describe, expect, it } from "vitest";

import { MARKETING_SITE_CSS } from "./marketing-site-css.js";
import { loadMarketingSiteCss } from "./load-marketing-site-css.js";

describe("marketing-site-css", () => {
  it("exports semantic classes used by SSR and SPA", () => {
    expect(MARKETING_SITE_CSS).toContain(".btn {");
    expect(MARKETING_SITE_CSS).toContain(".sec-band");
    expect(MARKETING_SITE_CSS).toContain(".hero");
    expect(MARKETING_SITE_CSS).not.toContain("@import");
  });

  it("loadMarketingSiteCss returns the same stylesheet", () => {
    expect(loadMarketingSiteCss()).toBe(MARKETING_SITE_CSS);
  });
});

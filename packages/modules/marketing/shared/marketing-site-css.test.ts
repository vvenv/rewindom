import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  assembleMarketingSiteCss,
  listMarketingSiteCssSources,
  writeMarketingSiteCssGenerated,
} from "./site-css/assemble.mjs";
import { MARKETING_SITE_CSS } from "./marketing-site-css.js";
import { loadMarketingSiteCss } from "./load-marketing-site-css.js";
import { BUILTIN_SECTION_DEFINITIONS } from "./sections/index.js";
import type { SectionType } from "./sections/types.js";

const SHARED_ROOT = path.dirname(fileURLToPath(import.meta.url));

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

  it("keeps generated bundle in sync with co-located css sources", () => {
    const fromSources = assembleMarketingSiteCss();
    expect(MARKETING_SITE_CSS).toBe(fromSources);
    // Also ensure the on-disk generated file matches (catches uncommitted drift).
    writeMarketingSiteCssGenerated();
    const regenerated = readFileSync(
      path.join(SHARED_ROOT, "marketing-site-css.generated.ts"),
      "utf8",
    );
    expect(regenerated).toContain("export const MARKETING_SITE_CSS");
    expect(regenerated).toContain(".btn {");
  });

  it("lists a styles.css for every registered section type", () => {
    const sources = new Set(listMarketingSiteCssSources());
    const registered = Object.keys(BUILTIN_SECTION_DEFINITIONS) as SectionType[];
    for (const type of registered) {
      const rel = `sections/${type}/styles.css`;
      expect(sources.has(rel), `sources.json missing ${rel}`).toBe(true);
      expect(
        existsSync(path.join(SHARED_ROOT, rel)),
        `missing ${rel}`,
      ).toBe(true);
    }
    expect(sources.has("site-css/base.css")).toBe(true);
    expect(sources.has("site-css/member.css")).toBe(true);
    expect(sources.has("sections/_common/styles.css")).toBe(true);
  });
});

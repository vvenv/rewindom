import { describe, expect, it } from "vitest";

import {
  BRAND_ICON_CHOICES,
  BRAND_ICON_LABELS,
  BRAND_ICON_SVG,
} from "./brand-icons.js";

describe("BRAND_ICON_SVG", () => {
  it.each(BRAND_ICON_CHOICES)("%s 有图形", (name) => {
    expect(BRAND_ICON_SVG[name]).toMatch(/^<path /u);
  });

  it("表和白名单对齐", () => {
    expect(Object.keys(BRAND_ICON_SVG).sort()).toEqual(
      [...BRAND_ICON_CHOICES].sort(),
    );
  });

  it("短名只覆盖白名单里的项", () => {
    for (const name of Object.keys(BRAND_ICON_LABELS)) {
      expect(BRAND_ICON_CHOICES).toContain(name);
    }
  });
});

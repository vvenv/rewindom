import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";

import { THEME_PALETTES, getThemePaletteLabel } from "@be-water/shared";

import {
  translateThemePaletteLabel,
  translateThemePaletteOptions,
} from "./translate-theme-palette.js";

function makeT(map: Record<string, string>) {
  return vi.fn(
    (
      key: string,
      opts?: { defaultValue?: string },
    ): string => map[key] ?? opts?.defaultValue ?? key,
  ) as unknown as TFunction;
}

describe("translate-theme-palette", () => {
  describe("translateThemePaletteLabel", () => {
    it("命中翻译时返回翻译值", () => {
      const t = makeT({ "themePalettes.water.label": "Water" });
      expect(translateThemePaletteLabel(t, "water")).toBe("Water");
      expect(t).toHaveBeenCalledWith(
        "themePalettes.water.label",
        expect.objectContaining({ ns: "shell", defaultValue: "水蓝" }),
      );
    });

    it("翻译缺失时回落到 shared 的 zh-CN label", () => {
      const t = makeT({});
      expect(translateThemePaletteLabel(t, "slate")).toBe("石墨");
    });

    it("未知 slug 回落到 slug 本身", () => {
      const t = makeT({});
      expect(translateThemePaletteLabel(t, "ghost")).toBe("ghost");
    });
  });

  describe("translateThemePaletteOptions", () => {
    it("返回所有配色,每项带 slug/label/description", () => {
      const t = makeT({
        "themePalettes.water.label": "Water",
        "themePalettes.slate.description": "Neutral slate",
      });

      const options = translateThemePaletteOptions(t);

      expect(options).toHaveLength(THEME_PALETTES.length);
      const slugs = options.map((o) => o.slug);
      expect(slugs).toEqual(["water", "slate"]);

      const water = options.find((o) => o.slug === "water")!;
      expect(water.label).toBe("Water");
      expect(water.description).toBe("默认配色：水蓝主色搭配青色数据强调");

      const slate = options.find((o) => o.slug === "slate")!;
      expect(slate.description).toBe("Neutral slate");
      expect(slate.label).toBe(getThemePaletteLabel("slate"));
    });
  });
});

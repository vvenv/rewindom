import { describe, expect, it } from "vitest";

import {
  DEFAULT_THEME_PALETTE,
  THEME_PALETTES,
  getThemePaletteLabel,
  isThemePaletteSlug,
  normalizeOptionalThemePalette,
  normalizeThemePalette,
} from "./theme-palette.js";

describe("theme-palette", () => {
  it("注册表里的 slug 唯一，且默认配色在册", () => {
    const slugs = THEME_PALETTES.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toContain(DEFAULT_THEME_PALETTE);
  });

  it("isThemePaletteSlug 只认注册过的字符串", () => {
    expect(isThemePaletteSlug("azure")).toBe(true);
    expect(isThemePaletteSlug("slate")).toBe(true);
    expect(isThemePaletteSlug("neon")).toBe(false);
    expect(isThemePaletteSlug(null)).toBe(false);
    expect(isThemePaletteSlug(1)).toBe(false);
  });

  it("normalizeThemePalette 把非法值收敛到 fallback", () => {
    expect(normalizeThemePalette("slate")).toBe("slate");
    expect(normalizeThemePalette(undefined)).toBe(DEFAULT_THEME_PALETTE);
    expect(normalizeThemePalette("neon")).toBe(DEFAULT_THEME_PALETTE);
    expect(normalizeThemePalette("neon", "slate")).toBe("slate");
  });

  it("normalizeOptionalThemePalette 用 null 表示继承", () => {
    expect(normalizeOptionalThemePalette("slate")).toBe("slate");
    // 空串是 UI 里「跟随默认 / 继承」的哨兵值
    expect(normalizeOptionalThemePalette("")).toBeNull();
    expect(normalizeOptionalThemePalette("neon")).toBeNull();
    expect(normalizeOptionalThemePalette(undefined)).toBeNull();
  });

  it("getThemePaletteLabel 未知 slug 原样返回", () => {
    expect(getThemePaletteLabel("azure")).toBe("青蓝");
    expect(getThemePaletteLabel("neon")).toBe("neon");
  });
});

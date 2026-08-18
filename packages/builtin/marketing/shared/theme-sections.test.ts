import { describe, expect, it } from "vitest";

import { parseThemeSettings, resolveThemeSettings } from "./theme-sections.js";

describe("theme settings", () => {
  it("parses font and color", () => {
    expect(
      parseThemeSettings({
        primary_color: "#0f766e",
        font_family: "serif",
        logo_url: "https://example.com/logo.png",
      }),
    ).toEqual({
      primary_color: "#0f766e",
      font_family: "serif",
      logo_url: "https://example.com/logo.png",
    });
  });

  it("resolveThemeSettings fills every field from the JSON alone", () => {
    // logo / 主色曾经另有独立列，已随 20260804020000 迁移删除：JSON 是唯一真相源
    expect(
      resolveThemeSettings({ logo_url: "/a.png", primary_color: "#111" }),
    ).toEqual({
      logo_url: "/a.png",
      favicon_url: null,
      og_image: null,
      primary_color: "#111",
      bg_color: null,
      fg_color: null,
      font_family: "system",
      page_width: "default",
      section_spacing: 16,
    });
  });

  it("resolveThemeSettings falls back to defaults on empty or broken input", () => {
    const empty = {
      logo_url: null,
      favicon_url: null,
      og_image: null,
      primary_color: null,
      bg_color: null,
      fg_color: null,
      font_family: "system",
      page_width: "default",
      section_spacing: 16,
    };
    expect(resolveThemeSettings({})).toEqual(empty);
    expect(resolveThemeSettings(null)).toEqual(empty);
    // 脏数据不该炸掉渲染
    expect(resolveThemeSettings({ primary_color: "not-a-color" })).toEqual(
      empty,
    );
  });

  it("parses canvas colors with alpha", () => {
    expect(
      parseThemeSettings({ bg_color: "#0a0a0a80", fg_color: "#fff" }),
    ).toEqual({ bg_color: "#0a0a0a80", fg_color: "#fff" });
    expect(() => parseThemeSettings({ bg_color: "red" })).toThrow(
      "site.theme_settings_invalid",
    );
  });

  it("parses layout settings and rejects out-of-range spacing", () => {
    expect(parseThemeSettings({ page_width: "wide" }).page_width).toBe("wide");
    expect(() => parseThemeSettings({ page_width: "huge" })).toThrow(
      "site.theme_settings_invalid",
    );
    expect(parseThemeSettings({ section_spacing: 40 }).section_spacing).toBe(
      40,
    );
    // 落在步进上，避免存进来半个像素
    expect(parseThemeSettings({ section_spacing: 41 }).section_spacing).toBe(
      40,
    );
    expect(() => parseThemeSettings({ section_spacing: 200 })).toThrow(
      "site.theme_settings_invalid",
    );
    expect(() => parseThemeSettings({ section_spacing: -8 })).toThrow(
      "site.theme_settings_invalid",
    );
  });

  it("rejects malformed color and unknown font", () => {
    expect(() => parseThemeSettings({ primary_color: "#0f" })).toThrow(
      "site.theme_settings_invalid",
    );
    expect(parseThemeSettings({ font_family: "inter" }).font_family).toBe(
      "inter",
    );
    expect(() => parseThemeSettings({ font_family: "comic" })).toThrow(
      "site.theme_settings_invalid",
    );
    expect(parseThemeSettings({ primary_color: null }).primary_color).toBe(
      null,
    );
  });
});

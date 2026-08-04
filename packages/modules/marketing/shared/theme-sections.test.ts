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
      primary_color: "#111",
      font_family: "system",
      page_nav: "left",
      page_width: "default",
      section_spacing: 16,
    });
  });

  it("resolveThemeSettings falls back to defaults on empty or broken input", () => {
    const empty = {
      logo_url: null,
      primary_color: null,
      font_family: "system",
      page_nav: "left",
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

  it("parses page_nav and rejects unknown positions", () => {
    expect(parseThemeSettings({ page_nav: "right" }).page_nav).toBe("right");
    expect(parseThemeSettings({ page_nav: "off" }).page_nav).toBe("off");
    expect(() => parseThemeSettings({ page_nav: "top" })).toThrow(
      "site.theme_settings_invalid",
    );
  });

  it("rejects malformed color and unknown font", () => {
    expect(() => parseThemeSettings({ primary_color: "#0f" })).toThrow(
      "site.theme_settings_invalid",
    );
    expect(() => parseThemeSettings({ font_family: "comic" })).toThrow(
      "site.theme_settings_invalid",
    );
    expect(parseThemeSettings({ primary_color: null }).primary_color).toBe(
      null,
    );
  });
});

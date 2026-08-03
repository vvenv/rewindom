import { describe, expect, it } from "vitest";

import {
  createSection,
  homeBlocksToSections,
  mergeThemeDraft,
  parseSections,
  parseThemeSettings,
  resolvePageSections,
  resolveThemeSettings,
} from "./theme-sections.js";

describe("parseSections", () => {
  it("parses layout primitives", () => {
    const sections = parseSections([
      {
        id: "a",
        type: "hero",
        settings: { headline: "Hi", subhead: "Sub" },
      },
      {
        id: "b",
        type: "cards",
        settings: {
          columns: 3,
          items: [{ title: "A", body: "d" }],
        },
      },
    ]);
    expect(sections).toHaveLength(2);
    expect(sections[0]?.type).toBe("hero");
    expect(sections[1]?.settings).toEqual({
      columns: 3,
      items: [{ title: "A", body: "d" }],
    });
  });

  it("normalizes legacy types", () => {
    const sections = parseSections([
      {
        id: "f",
        type: "features",
        settings: { items: [{ title: "A", description: "d" }] },
      },
      {
        id: "c",
        type: "cta",
        settings: { headline: "Go", cta_label: "Click", cta_href: "/x" },
      },
      {
        id: "m",
        type: "markdown",
        settings: { body_md: "# Hi" },
      },
    ]);
    expect(sections.map((s) => s.type)).toEqual(["cards", "band", "prose"]);
    expect(sections[0]?.type === "cards" && sections[0].settings.items[0]).toEqual({
      title: "A",
      body: "d",
    });
    expect(sections[1]?.type === "band" && sections[1].settings).toEqual({
      headline: "Go",
      primary_label: "Click",
      primary_href: "/x",
    });
  });

  it("rejects unknown type", () => {
    expect(() =>
      parseSections([{ id: "x", type: "gallery", settings: {} }]),
    ).toThrow("site.sections_invalid");
  });
});

describe("homeBlocksToSections", () => {
  it("maps hero and features to cards", () => {
    const sections = homeBlocksToSections({
      hero: { headline: "H", cta_label: "Go", cta_href: "/login" },
      features: [{ title: "F1", description: "d1" }],
    });
    expect(sections.map((s) => s.type)).toEqual(["hero", "cards"]);
  });
});

describe("resolvePageSections", () => {
  it("falls back to body_md when sections empty", () => {
    const sections = resolvePageSections({
      sections: [],
      body_md: "# Hello",
    });
    expect(sections).toHaveLength(1);
    expect(sections[0]?.type).toBe("prose");
  });

  it("prefers sections over body_md", () => {
    const sections = resolvePageSections({
      sections: [createSection("band")],
      body_md: "# ignored",
    });
    expect(sections).toHaveLength(1);
    expect(sections[0]?.type).toBe("band");
  });
});

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

  it("resolveThemeSettings merges columns", () => {
    expect(
      resolveThemeSettings({
        theme_settings: {},
        logo_url: "/a.png",
        primary_color: "#111",
      }),
    ).toEqual({
      logo_url: "/a.png",
      primary_color: "#111",
      font_family: "system",
    });
  });

  it("mergeThemeDraft applies valid color live and keeps base while typing", () => {
    const base = { primary_color: "#0369a1", font_family: "system" as const };
    expect(mergeThemeDraft(base, { primary_color: "#0f766e" }).primary_color).toBe(
      "#0f766e",
    );
    expect(mergeThemeDraft(base, { primary_color: "#0f" }).primary_color).toBe(
      "#0369a1",
    );
    expect(mergeThemeDraft(base, { primary_color: null }).primary_color).toBe(
      null,
    );
  });
});

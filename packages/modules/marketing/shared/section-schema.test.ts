import { describe, expect, it } from "vitest";

import {
  PAGE_SECTION_TYPES,
  SECTION_DEFINITIONS,
  splitSettingsByScope,
  createBlock,
  createSection,
  homeBlocksToSections,
  parseAreaSection,
  parseSections,
  parseSettingValues,
  resolvePageSections,
  resolveSectionGaps,
  resolveSectionLayout,
  safeAreaSection,
  safeSections,
  settingText,
} from "./section-schema.js";

describe("parseSettingValues", () => {
  const defs = SECTION_DEFINITIONS.cards.settings;

  it("fills defaults for missing values", () => {
    expect(parseSettingValues(defs, {})).toEqual({
      heading: "",
      subheading: "",
      columns: 3,
      card_style: "bordered",
      // 所有 page section 共有的版式设置
      width: "page",
      content_width: "default",
      padding_top: 32,
      padding_bottom: 32,
      spacing_above: -4,
      spacing_below: -4,
      background: "none",
      divider: "none",
      anchor: "",
    });
  });

  it("clamps range and falls back on unknown select option", () => {
    const values = parseSettingValues(defs, { columns: 9, card_style: "neon" });
    expect(values.columns).toBe(4);
    expect(values.card_style).toBe("bordered");
    expect(parseSettingValues(defs, { columns: "2" }).columns).toBe(2);
  });

  it("throws when a required text setting is blank", () => {
    expect(() =>
      parseSettingValues(SECTION_DEFINITIONS.hero.settings, { headline: "  " }),
    ).toThrow("site.sections_invalid");
  });
});

describe("createSection", () => {
  it("seeds defaults and preset blocks", () => {
    const section = createSection("cards");
    expect(section.settings.columns).toBe(3);
    expect(section.blocks).toHaveLength(1);
    expect(section.blocks[0]?.type).toBe("card");
  });

  it("rejects a block type the section does not declare", () => {
    expect(() => createBlock("cards", "gallery")).toThrow(
      "site.sections_invalid",
    );
  });
});

describe("parseSections", () => {
  it("parses layout primitives and lifts cards items into blocks", () => {
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
    expect(settingText(sections[0]!.settings, "headline")).toBe("Hi");
    expect(sections[1]?.type).toBe("cards");
    expect(sections[1]?.blocks).toHaveLength(1);
    expect(settingText(sections[1]!.blocks[0]!.settings, "title")).toBe("A");
    expect(settingText(sections[1]!.blocks[0]!.settings, "body")).toBe("d");
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
    expect(sections.map((s) => s.type)).toEqual([
      "feature-grid",
      "band",
      "prose",
    ]);
    expect(settingText(sections[0]!.blocks[0]!.settings, "title")).toBe("A");
    expect(settingText(sections[0]!.blocks[0]!.settings, "body")).toBe("d");
    expect(settingText(sections[1]!.settings, "headline")).toBe("Go");
    expect(settingText(sections[1]!.settings, "primary_label")).toBe("Click");
    expect(settingText(sections[1]!.settings, "primary_href")).toBe("/x");
  });

  it("keeps declared block types and drops the rest", () => {
    const [section] = parseSections([
      {
        type: "cards",
        settings: {},
        blocks: [
          { type: "card", settings: { title: "keep" } },
          { type: "stat", settings: { value: "99%" } },
          { type: "gallery", settings: { title: "drop" } },
        ],
      },
    ]);
    expect(section?.blocks.map((block) => block.type)).toEqual([
      "card",
      "stat",
    ]);
  });

  it("enforces max_blocks", () => {
    const [section] = parseSections([
      {
        type: "cards",
        settings: {},
        blocks: Array.from({ length: 20 }, (_, index) => ({
          type: "card",
          settings: { title: `T${index}` },
        })),
      },
    ]);
    expect(section?.blocks).toHaveLength(
      SECTION_DEFINITIONS.cards.max_blocks ?? 0,
    );
  });

  it("rejects unknown type", () => {
    expect(() =>
      parseSections([{ id: "x", type: "gallery", settings: {} }]),
    ).toThrow("site.sections_invalid");
  });
});

describe("safeSections", () => {
  it("skips only the broken section", () => {
    const sections = safeSections([
      { id: "ok", type: "band", settings: { headline: "Fine" } },
      { id: "bad", type: "hero", settings: { headline: "" } },
      { id: "ok2", type: "prose", settings: { body_md: "x" } },
    ]);
    expect(sections.map((section) => section.id)).toEqual(["ok", "ok2"]);
  });
});

describe("homeBlocksToSections", () => {
  it("maps hero and features to cards", () => {
    const sections = homeBlocksToSections({
      hero: { headline: "H", cta_label: "Go", cta_href: "/login" },
      features: [{ title: "F1", description: "d1" }],
    });
    expect(sections.map((s) => s.type)).toEqual(["hero", "feature-grid"]);
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

describe("parseAreaSection", () => {
  it("migrates the legacy nav array into header nav_link blocks", () => {
    const header = parseAreaSection("header", [
      { label: "Docs", href: "/docs" },
      { label: "Pricing", href: "/pricing" },
      { label: "", href: "/broken" },
    ]);
    expect(header.type).toBe("header");
    expect(header.blocks.map((b) => b.type)).toEqual(["nav_link", "nav_link"]);
    expect(settingText(header.blocks[0]!.settings, "label")).toBe("Docs");
    // 站点级默认值同样由 schema 兜底
    expect(header.settings.sticky).toBe(true);
  });

  it("round-trips an already-migrated section object", () => {
    const first = parseAreaSection("footer", [
      { label: "GitHub", href: "/gh" },
    ]);
    const again = parseAreaSection("footer", first);
    expect(again.blocks).toHaveLength(1);
    expect(settingText(again.blocks[0]!.settings, "href")).toBe("/gh");
  });

  it("rejects a section stored under the wrong area column", () => {
    expect(() =>
      parseAreaSection("header", { type: "footer", settings: {}, blocks: [] }),
    ).toThrow("site.sections_invalid");
    // safe 版本回落到默认页头，不炸整个站点
    expect(safeAreaSection("header", { type: "footer" }).type).toBe("header");
  });

  it("keeps header/footer out of the page section stream", () => {
    expect(() => parseSections([{ type: "header", settings: {} }])).toThrow(
      "site.sections_invalid",
    );
  });
});

describe("section layout settings", () => {
  it("gives every page section the shared layout group", () => {
    for (const type of PAGE_SECTION_TYPES) {
      const ids = SECTION_DEFINITIONS[type].settings
        .map((def) => ("id" in def ? def.id : ""))
        .filter(Boolean);
      expect(ids, type).toEqual(
        expect.arrayContaining([
          "width",
          "content_width",
          "padding_top",
          "padding_bottom",
          "spacing_above",
          "spacing_below",
          "background",
          "divider",
          "anchor",
        ]),
      );
      // 同一个 id 只能声明一次，否则编辑器会渲染出两个控件
      expect(new Set(ids).size, type).toBe(ids.length);
    }
  });

  it("resolves layout values with defaults and rejects unknown backgrounds", () => {
    expect(resolveSectionLayout(createSection("prose").settings)).toEqual({
      width: "page",
      contentWidth: "default",
      paddingTop: 32,
      paddingBottom: 32,
      spacingAbove: null,
      spacingBelow: null,
      background: "none",
      dividerTop: false,
      dividerBottom: false,
      anchor: "",
    });
    expect(
      resolveSectionLayout({ width: "zzz", content_width: "zzz" }),
    ).toMatchObject({ width: "page", contentWidth: "default" });
  });

  it("keeps the two width axes independent", () => {
    // 通栏色带 + 居中正文（Dawn 口径）
    expect(
      resolveSectionLayout({ width: "full", content_width: "default" }),
    ).toMatchObject({ width: "full", contentWidth: "default" });
    // 通栏大图：色块和正文都不限宽
    expect(
      resolveSectionLayout({ width: "full", content_width: "full" }),
    ).toMatchObject({ width: "full", contentWidth: "full" });
  });

  it("migrates the old single width setting onto the two axes", () => {
    const defs = SECTION_DEFINITIONS.cards.settings;
    expect(parseSettingValues(defs, { width: "wide" })).toMatchObject({
      width: "page",
      content_width: "default",
    });
    // narrow 说的一直是正文，色块本身仍是限宽的
    expect(parseSettingValues(defs, { width: "narrow" })).toMatchObject({
      width: "page",
      content_width: "narrow",
    });
  });

  it("reads section spacing as an override of the theme value", () => {
    // 哨兵负值 = 继承
    expect(resolveSectionLayout({}).spacingBelow).toBeNull();
    expect(resolveSectionLayout({ spacing_below: -4 }).spacingBelow).toBeNull();
    expect(resolveSectionLayout({ spacing_below: 0 }).spacingBelow).toBe(0);
    expect(resolveSectionLayout({ spacing_above: 48 }).spacingAbove).toBe(48);
  });

  it("gaps a section from its neighbour by whichever side asks for more", () => {
    const layouts = [
      resolveSectionLayout({}), // 继承
      resolveSectionLayout({ spacing_above: 64 }), // 自己要 64
      resolveSectionLayout({}), // 上一段没要求 → 继承
      resolveSectionLayout({ spacing_above: 0 }), // 明确不要缝
    ];
    // 首段不加间距，页头贴边
    expect(resolveSectionGaps(layouts, 16)).toEqual([0, 64, 16, 0]);
    // 主题值调大，没覆盖的段跟着变
    expect(resolveSectionGaps(layouts, 40)).toEqual([0, 64, 40, 0]);
  });

  it("lets a section push its neighbour away from below too", () => {
    const layouts = [
      resolveSectionLayout({ spacing_below: 80 }),
      resolveSectionLayout({ spacing_above: 8 }),
    ];
    expect(resolveSectionGaps(layouts, 16)).toEqual([0, 80]);
  });

  it("lets an explicit override win over the neighbour's inherited value", () => {
    // 设成 0 是为了和上一段拼成连续色带；邻居继承来的主题值不该把它挡住
    const layouts = [
      resolveSectionLayout({}),
      resolveSectionLayout({ spacing_above: 0 }),
    ];
    expect(resolveSectionGaps(layouts, 40)).toEqual([0, 0]);
  });

  it("keeps hero roomier than the rest by default", () => {
    const hero = resolveSectionLayout(createSection("hero").settings);
    const cards = resolveSectionLayout(createSection("cards").settings);
    expect(hero.paddingTop).toBeGreaterThan(cards.paddingTop);
    expect(hero.paddingBottom).toBeGreaterThan(cards.paddingBottom);
  });

  it("slugifies the anchor before it reaches an HTML id", () => {
    expect(resolveSectionLayout({ anchor: "  Our Pricing! " }).anchor).toBe(
      "our-pricing",
    );
    expect(resolveSectionLayout({ anchor: '"><script>' }).anchor).toBe(
      "script",
    );
  });

  it("migrates the old divider checkboxes and band tone", () => {
    const defs = SECTION_DEFINITIONS.band.settings;
    expect(parseSettingValues(defs, { divider_bottom: true }).divider).toBe(
      "bottom",
    );
    expect(
      parseSettingValues(defs, { divider_top: true, divider_bottom: true })
        .divider,
    ).toBe("both");
    expect(parseSettingValues(defs, { tone: "accent" }).background).toBe(
      "accent",
    );
    expect(parseSettingValues(defs, { tone: "plain" }).background).toBe("none");
    // 新值优先，不被旧字段覆盖
    expect(
      parseSettingValues(defs, { tone: "accent", background: "outline" })
        .background,
    ).toBe("outline");
  });
});

describe("splitSettingsByScope", () => {
  it("puts every layout setting in the layout tab and keeps copy in content", () => {
    for (const type of PAGE_SECTION_TYPES) {
      const { content, layout } = splitSettingsByScope(
        SECTION_DEFINITIONS[type].settings,
      );
      const ids = (defs: typeof content) =>
        defs.map((def) => ("id" in def ? def.id : "")).filter(Boolean);
      expect(ids(layout), type).toEqual(
        expect.arrayContaining(["padding_top", "padding_bottom", "width"]),
      );
      // 两边加起来仍是完整的一份，不丢字段
      expect(content.length + layout.length, type).toBe(
        SECTION_DEFINITIONS[type].settings.length,
      );
      expect(ids(content), type).not.toContain("padding_top");
    }
  });

  it("leaves site areas without a layout tab", () => {
    expect(
      splitSettingsByScope(SECTION_DEFINITIONS.header.settings).layout,
    ).toHaveLength(0);
  });
});

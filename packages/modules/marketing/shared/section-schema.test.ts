import { describe, expect, it } from "vitest";

import {
  PAGE_SECTION_TYPES,
  SECTION_DEFINITIONS,
  splitSettingsByScope,
  createBlock,
  createSection,
  homeBlocksToSections,
  parseAreaSections,
  parseSections,
  parseSettingValues,
  resolveSectionGaps,
  resolveSectionLayout,
  resolveSurfaceStyle,
  relocalizeSections,
  resolveGroupSpans,
  groupColumns,
  localizeSections,
  safeAreaSections,
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
      padding_top: 0,
      padding_bottom: 0,
      spacing_above: -4,
      spacing_below: -4,
      background: "none",
      divider: "none",
      anchor: "",
      // 通用外观（styleSettings）
      bg_color: "",
      fg_color: "",
      border_color: "",
      border_width: 0,
      radius: -4,
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

describe("parseAreaSections", () => {
  it("页头区是一串 section，本体缺了就补上", () => {
    const header = parseAreaSections("header", []);
    expect(header.map((s) => s.type)).toEqual(["header"]);
    // 站点级默认值同样由 schema 兜底
    expect(header[0]!.settings.sticky).toBe(true);
  });

  it("公告条排在导航条上方，一起存一起取", () => {
    const header = parseAreaSections("header", [
      { type: "band", settings: { headline: "限时优惠" }, blocks: [] },
      { type: "header", settings: {}, blocks: [] },
    ]);
    expect(header.map((s) => s.type)).toEqual(["band", "header"]);
    expect(settingText(header[0]!.settings, "headline")).toBe("限时优惠");
  });

  // placements 说了算：pricing 没声明能进页头，就不许存进去
  it("拒收没声明能放进该区域的段", () => {
    expect(() =>
      parseAreaSections("header", [
        { type: "pricing", settings: {}, blocks: [] },
      ]),
    ).toThrow("site.sections_invalid");
    // safe 版本回落到只剩本体，不炸整个站点
    expect(
      safeAreaSections("header", [{ type: "pricing" }]).map((s) => s.type),
    ).toEqual(["header"]);
  });

  it("本体只留一段：存了两个导航条也只认第一个", () => {
    const header = parseAreaSections("header", [
      { type: "header", settings: {}, blocks: [] },
      { type: "header", settings: {}, blocks: [] },
    ]);
    expect(header.filter((s) => s.type === "header")).toHaveLength(1);
  });

  it("页脚本体排在最前，其余段跟在后面", () => {
    const footer = parseAreaSections("footer", [
      { type: "prose", settings: { body_md: "备案号" }, blocks: [] },
    ]);
    expect(footer.map((s) => s.type)).toEqual(["footer", "prose"]);
  });
});

describe("页面区块流", () => {
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
          "bg_color",
          "fg_color",
          "border_color",
          "border_width",
          "radius",
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
      paddingTop: 0,
      paddingBottom: 0,
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

  it("resolves surface colors with alpha and border width fallback", () => {
    expect(resolveSurfaceStyle({})).toEqual({
      backgroundColor: null,
      color: null,
      borderColor: null,
      borderWidth: 0,
      borderRadius: null,
    });
    expect(
      resolveSurfaceStyle({
        bg_color: "#0f766e80",
        fg_color: "#fff",
        border_color: "#00000033",
        border_width: 0,
        radius: 16,
      }),
    ).toEqual({
      backgroundColor: "#0f766e80",
      color: "#fff",
      borderColor: "#00000033",
      borderWidth: 1,
      borderRadius: 16,
    });
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

  it("migrates header login fields to the secondary button", () => {
    const defs = SECTION_DEFINITIONS.header.settings;
    const on = parseSettingValues(defs, {
      show_login: true,
      login_label: "登录",
    });
    expect(on.secondary_label).toBe("登录");
    expect(on.secondary_href).toBe("/member/login");

    const off = parseSettingValues(defs, { show_login: false, login_label: "登录" });
    expect(off.secondary_label).toBe("");
    expect(off.secondary_href).toBe("");

    // 新值优先
    const kept = parseSettingValues(defs, {
      show_login: true,
      login_label: "登录",
      secondary_label: "Account",
      secondary_href: "/app",
    });
    expect(kept.secondary_label).toBe("Account");
    expect(kept.secondary_href).toBe("/app");
  });
});

describe("splitSettingsByScope", () => {
  it("puts layout and appearance in their own tabs and keeps copy in content", () => {
    for (const type of PAGE_SECTION_TYPES) {
      const { content, layout, appearance } = splitSettingsByScope(
        SECTION_DEFINITIONS[type].settings,
      );
      const ids = (defs: typeof content) =>
        defs.map((def) => ("id" in def ? def.id : "")).filter(Boolean);
      expect(ids(layout), type).toEqual(
        expect.arrayContaining(["padding_top", "padding_bottom", "width"]),
      );
      expect(ids(appearance), type).toEqual(
        expect.arrayContaining(["bg_color", "fg_color", "radius"]),
      );
      // 三边加起来仍是完整的一份，不丢字段
      expect(content.length + layout.length + appearance.length, type).toBe(
        SECTION_DEFINITIONS[type].settings.length,
      );
      expect(ids(content), type).not.toContain("padding_top");
      expect(ids(layout), type).not.toContain("bg_color");
    }
  });

  it("gives header and footer an appearance tab", () => {
    expect(
      splitSettingsByScope(SECTION_DEFINITIONS.header.settings).appearance
        .length,
    ).toBeGreaterThan(0);
    expect(
      splitSettingsByScope(SECTION_DEFINITIONS.footer.settings).appearance
        .length,
    ).toBeGreaterThan(0);
  });
});

describe("relocalizeSections", () => {
  const hero = (settings: Record<string, unknown>) => [
    { type: "hero", settings, blocks: [] },
  ];

  it("seeds the target locale with the source text and keeps the source", () => {
    const sections = parseSections(
      hero({ headline: "你好", subhead: "副标题" }),
    );
    const [copied] = relocalizeSections(sections, "zh-CN", "en", "zh-CN");
    // 纯字符串（= 主语言原文）升级成 __i18n，两种语言都指向同一句原文
    expect(copied!.settings.headline).toEqual({
      __i18n: { "zh-CN": "你好", en: "你好" },
    });
    expect(copied!.settings.subhead).toEqual({
      __i18n: { "zh-CN": "副标题", en: "副标题" },
    });
  });

  it("copies the source locale slot, not the site default", () => {
    const sections = parseSections(
      hero({ headline: { __i18n: { "zh-CN": "你好", en: "Hello" } } }),
    );
    // en → zh-CN：目标槽位要拿 en 的原文当翻译起点
    const [copied] = relocalizeSections(sections, "en", "zh-CN", "zh-CN");
    expect(copied!.settings.headline).toEqual({
      __i18n: { "zh-CN": "Hello", en: "Hello" },
    });
  });

  it("leaves non-localizable settings and same-locale copies untouched", () => {
    const sections = parseSections(
      hero({ headline: "你好", primary_href: "/pricing", show_glow: true }),
    );
    expect(relocalizeSections(sections, "zh-CN", "zh-CN", "zh-CN")).toBe(
      sections,
    );
    const [copied] = relocalizeSections(sections, "zh-CN", "en", "zh-CN");
    expect(copied!.settings.primary_href).toBe("/pricing");
    expect(copied!.settings.show_glow).toBe(true);
  });

  it("seeds block copy too", () => {
    const sections = parseSections([
      {
        type: "faq",
        settings: {},
        blocks: [
          { type: "qa", settings: { question: "多少钱？", answer: "免费" } },
        ],
      },
    ]);
    const [copied] = relocalizeSections(sections, "zh-CN", "en", "zh-CN");
    expect(copied!.blocks[0]!.settings.question).toEqual({
      __i18n: { "zh-CN": "多少钱？", en: "多少钱？" },
    });
  });
});

describe("容器段（group）", () => {
  const groupWith = (
    children: unknown[],
    settings: Record<string, unknown> = {},
  ) => ({
    type: "group",
    settings,
    blocks: [
      { type: "column", settings: {}, sections: children },
      { type: "column", settings: {} },
    ],
  });

  it("解析列里的子段，并给没写 sections 的列补空数组", () => {
    const [group] = parseSections([
      groupWith([{ type: "page-menu", settings: { source: "siblings" } }]),
    ]);
    expect(group!.blocks[0]!.sections?.map((s) => s.type)).toEqual([
      "page-menu",
    ]);
    expect(group!.blocks[1]!.sections).toEqual([]);
  });

  // 深度上限 1：容器段不能装容器段，否则「布局原语」会滑成自由画布
  it("拒绝嵌套的容器段（写路径抛错、读路径只丢里面那一段）", () => {
    const nested = [groupWith([groupWith([])])];
    expect(() => parseSections(nested)).toThrow("site.sections_invalid");
    const [survived] = safeSections(nested);
    expect(survived!.type).toBe("group");
    expect(survived!.blocks[0]!.sections).toEqual([]);
  });

  it("读路径只丢坏掉的那个子段，不连坐整个容器段", () => {
    const [group] = safeSections([
      groupWith([
        { type: "band", settings: { headline: "Fine" } },
        { type: "gallery", settings: {} },
        { type: "prose", settings: { body_md: "x" } },
      ]),
    ]);
    expect(group!.blocks[0]!.sections?.map((s) => s.type)).toEqual([
      "band",
      "prose",
    ]);
  });

  it("写路径对坏子段直接抛错", () => {
    expect(() =>
      parseSections([groupWith([{ type: "gallery", settings: {} }])]),
    ).toThrow("site.sections_invalid");
  });

  it("createSection 预置两列", () => {
    const group = createSection("group");
    expect(group.blocks.map((b) => b.type)).toEqual(["column", "column"]);
    expect(group.blocks[0]!.sections).toEqual([]);
  });

  it("列宽按比例解析，比例与列数对不上时等分回落", () => {
    expect(resolveGroupSpans("1:3", 2)).toEqual([3, 9]);
    expect(resolveGroupSpans("1:1:1", 3)).toEqual([4, 4, 4]);
    // 比例是两列、实际三列：按列数等分，总和仍是 12
    expect(resolveGroupSpans("1:3", 3)).toEqual([4, 4, 4]);
    expect(resolveGroupSpans("1:3", 1)).toEqual([12]);
    expect(resolveGroupSpans("zzz", 2)).toEqual([6, 6]);
    expect(resolveGroupSpans("1:3", 0)).toEqual([]);
  });

  it("groupColumns 带出列宽与列设置", () => {
    const [group] = parseSections([
      {
        type: "group",
        settings: { columns_layout: "1:3" },
        blocks: [
          {
            type: "column",
            settings: { sticky: true, stack_order: "last" },
            sections: [{ type: "prose", settings: { body_md: "x" } }],
          },
          { type: "column", settings: {} },
        ],
      },
    ]);
    const columns = groupColumns(group!);
    expect(columns.map((c) => c.span)).toEqual([3, 9]);
    expect(columns[0]!.sticky).toBe(true);
    expect(columns[0]!.stackOrder).toBe("last");
    expect(columns[1]!.stackOrder).toBe("auto");
    expect(columns[0]!.sections.map((s) => s.type)).toEqual(["prose"]);
  });

  // 漏了递归的话，列里的文案在公开页会整片空白
  it("localize / relocalize 递归进列里的子段", () => {
    const [group] = parseSections([
      groupWith([
        {
          type: "band",
          settings: { headline: { __i18n: { "zh-CN": "你好", en: "Hello" } } },
        },
      ]),
    ]);

    const [localized] = localizeSections([group!], "en", "zh-CN");
    expect(localized!.blocks[0]!.sections?.[0]?.settings.headline).toBe(
      "Hello",
    );

    const [copied] = relocalizeSections([group!], "en", "zh-CN", "zh-CN");
    expect(copied!.blocks[0]!.sections?.[0]?.settings.headline).toEqual({
      __i18n: { "zh-CN": "Hello", en: "Hello" },
    });
  });
});

import { describe, expect, it } from "vitest";

import { registerLocaleCatalog } from "@rewindom/shared";

import {
  PAGE_SECTION_TYPES,
  BUILTIN_SECTION_DEFINITIONS,
  splitSettingsByScope,
  createBlock,
  createSection,
  parseAreaSections,
  parseSections,
  parseSettingValues,
  resolveSectionGaps,
  resolveSectionLayout,
  resolveSurfaceStyle,
  relocalizeSections,
  parseGroupSpans,
  refitGroupSpans,
  resolveGroupSpans,
  groupColumnCss,
  groupColumns,
  localizeSections,
  safeAreaSections,
  safeSections,
  settingText,
} from "./section-schema.js";

describe("parseSettingValues", () => {
  const defs = BUILTIN_SECTION_DEFINITIONS.form.settings;

  it("fills defaults for missing values", () => {
    expect(parseSettingValues(defs, {})).toMatchObject({
      heading: "",
      subheading: "",
      submit_label: {
        __i18n: { "zh-CN": "提交", en: "Submit" },
      },
      success_message: "",
      width: "page",
      content_width: "default",
      padding_top: 0,
      padding_right: 0,
      padding_bottom: 0,
      padding_left: 0,
      spacing_above: -4,
      spacing_below: -4,
      divider: "none",
      anchor: "",
      bg_color: "",
      inner_bg_color: "",
      fg_color: "",
      border_color: "",
      border_width: 0,
      radius: -4,
    });
  });

  it("throws when a required text setting is blank", () => {
    expect(() =>
      parseSettingValues(defs, {
        submit_label: "  ",
      }),
    ).toThrow("site.sections_invalid");
  });

  it("throws when a required hero headline is blank", () => {
    expect(() =>
      parseSettingValues(BUILTIN_SECTION_DEFINITIONS.hero.settings, {
        headline: "  ",
      }),
    ).toThrow("site.sections_invalid");
  });

  it("seeds a namespaced default key as an __i18n table", () => {
    registerLocaleCatalog("section-settings-test", {
      "zh-CN": { cart: { label: "购物车" } },
      en: { cart: { label: "Cart" } },
    });
    const defs = [
      {
        type: "text" as const,
        id: "label",
        label: "x",
        default: "section-settings-test:cart.label",
      },
    ];
    expect(parseSettingValues(defs, {}).label).toEqual({
      __i18n: { "zh-CN": "购物车", en: "Cart" },
    });
  });

  it("upgrades a stock default string or leaked key back to the built-in table", () => {
    registerLocaleCatalog("section-settings-test", {
      "zh-CN": { cart: { label: "购物车" } },
      en: { cart: { label: "Cart" } },
    });
    const defs = [
      {
        type: "text" as const,
        id: "label",
        label: "x",
        default: "section-settings-test:cart.label",
      },
    ];
    expect(parseSettingValues(defs, { label: "Cart" }).label).toEqual({
      __i18n: { "zh-CN": "购物车", en: "Cart" },
    });
    expect(parseSettingValues(defs, { label: "购物车" }).label).toEqual({
      __i18n: { "zh-CN": "购物车", en: "Cart" },
    });
    expect(
      parseSettingValues(defs, { label: "section-settings-test:cart.label" })
        .label,
    ).toEqual({
      __i18n: { "zh-CN": "购物车", en: "Cart" },
    });
  });

  it("expands a leaked namespaced key even when the field has no default", () => {
    registerLocaleCatalog("section-settings-test", {
      "zh-CN": { cart: { label: "购物车" } },
      en: { cart: { label: "Cart" } },
    });
    const defs = [
      {
        type: "text" as const,
        id: "label",
        label: "x",
      },
    ];
    expect(
      parseSettingValues(defs, { label: "section-settings-test:cart.label" })
        .label,
    ).toEqual({
      __i18n: { "zh-CN": "购物车", en: "Cart" },
    });
  });

  it("keeps a custom string instead of the built-in table", () => {
    registerLocaleCatalog("section-settings-test", {
      "zh-CN": { cart: { label: "购物车" } },
      en: { cart: { label: "Cart" } },
    });
    const defs = [
      {
        type: "text" as const,
        id: "label",
        label: "x",
        default: "section-settings-test:cart.label",
      },
    ];
    expect(parseSettingValues(defs, { label: "My bag" }).label).toBe("My bag");
  });

  it("fills empty or swapped stock slots in an __i18n table", () => {
    registerLocaleCatalog("section-settings-test", {
      "zh-CN": { cart: { label: "购物车" } },
      en: { cart: { label: "Cart" } },
    });
    const defs = [
      {
        type: "text" as const,
        id: "label",
        label: "x",
        default: "section-settings-test:cart.label",
      },
    ];
    expect(
      parseSettingValues(defs, {
        label: { __i18n: { "zh-CN": "", en: "Cart" } },
      }).label,
    ).toEqual({
      __i18n: { "zh-CN": "购物车", en: "Cart" },
    });
    expect(
      parseSettingValues(defs, {
        label: { __i18n: { "zh-CN": "购物车", en: "" } },
      }).label,
    ).toEqual({
      __i18n: { "zh-CN": "购物车", en: "Cart" },
    });
    expect(
      parseSettingValues(defs, {
        label: { __i18n: { "zh-CN": "Cart", en: "购物车" } },
      }).label,
    ).toEqual({
      __i18n: { "zh-CN": "购物车", en: "Cart" },
    });
  });

  it("empty string on a namespaced default seeds the built-in table", () => {
    registerLocaleCatalog("section-settings-test", {
      "zh-CN": { cart: { label: "购物车" } },
      en: { cart: { label: "Cart" } },
    });
    const defs = [
      {
        type: "text" as const,
        id: "label",
        label: "x",
        default: "section-settings-test:cart.label",
      },
    ];
    expect(parseSettingValues(defs, { label: "" }).label).toEqual({
      __i18n: { "zh-CN": "购物车", en: "Cart" },
    });
  });
});

describe("createSection", () => {
  it("seeds defaults and preset blocks", () => {
    const section = createSection("form");
    expect(section.settings.submit_label).toEqual({
      __i18n: { "zh-CN": "提交", en: "Submit" },
    });
    expect(section.blocks.length).toBeGreaterThan(0);
    expect(section.blocks[0]?.type).toBe("field");
  });

  it("rejects a block type the section does not declare", () => {
    expect(() => createBlock("form", "gallery")).toThrow(
      "site.sections_invalid",
    );
  });
});

describe("parseSections", () => {
  it("parses layout primitives and card blocks", () => {
    const sections = parseSections([
      {
        id: "a",
        type: "hero",
        settings: { headline: "Hi", subhead: "Sub" },
      },
      {
        id: "b",
        type: "form",
        settings: { submit_label: "Send" },
        blocks: [{ type: "field", settings: { label: "A", type: "text" } }],
      },
    ]);
    expect(sections).toHaveLength(2);
    expect(sections[0]?.type).toBe("hero");
    expect(settingText(sections[0]!.settings, "headline")).toBe("Hi");
    expect(sections[1]?.type).toBe("form");
    expect(sections[1]?.blocks).toHaveLength(1);
    expect(settingText(sections[1]!.blocks[0]!.settings, "label")).toBe("A");
  });

  it("keeps declared block types and drops the rest", () => {
    const [section] = parseSections([
      {
        type: "form",
        settings: {},
        blocks: [
          { type: "field", settings: { label: "keep", type: "text" } },
          { type: "gallery", settings: { title: "drop" } },
        ],
      },
    ]);
    expect(section?.blocks.map((block) => block.type)).toEqual(["field"]);
  });

  it("enforces max_blocks", () => {
    const [section] = parseSections([
      {
        type: "form",
        settings: {},
        blocks: Array.from({ length: 20 }, (_, index) => ({
          type: "field",
          settings: { label: `T${index}`, type: "text" },
        })),
      },
    ]);
    expect(section?.blocks).toHaveLength(
      BUILTIN_SECTION_DEFINITIONS.form.max_blocks ?? 0,
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
      { id: "bad", type: "hero", settings: { headline: "  " } },
      { id: "ok2", type: "prose", settings: { body_md: "x" } },
    ]);
    expect(sections.map((section) => section.id)).toEqual(["ok", "ok2"]);
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

  // placements 说了算：hero 没声明能进页头，就不许存进去
  it("拒收没声明能放进该区域的段", () => {
    expect(() =>
      parseAreaSections("header", [
        { type: "hero", settings: {}, blocks: [] },
      ]),
    ).toThrow("site.sections_invalid");
    // safe 版本回落到只剩本体，不炸整个站点
    expect(
      safeAreaSections("header", [{ type: "hero" }]).map((s) => s.type),
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

  /*
   * 多栏页脚走分栏段，页脚本体不自造列宽配置——所以分栏必须进得了页脚区，
   * 且列里的子段要跟着一起存下来。
   */
  it("分栏段能放进页脚区，列里的子段照常存取", () => {
    const footer = parseAreaSections("footer", [
      {
        type: "group",
        settings: { columns_layout: "4:4:4" },
        blocks: [
          {
            type: "column",
            settings: {},
            sections: [
              { type: "prose", settings: { body_md: "产品" }, blocks: [] },
            ],
          },
          { type: "column", settings: {}, sections: [] },
          { type: "column", settings: {}, sections: [] },
        ],
      },
    ]);

    expect(footer.map((s) => s.type)).toEqual(["footer", "group"]);
    const group = footer[1]!;
    expect(group.blocks).toHaveLength(3);
    expect(group.blocks[0]!.sections?.map((s) => s.type)).toEqual(["prose"]);
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
      const ids = BUILTIN_SECTION_DEFINITIONS[type].settings
        .map((def) => ("id" in def ? def.id : ""))
        .filter(Boolean);
      expect(ids, type).toEqual(
        expect.arrayContaining([
          "width",
          "content_width",
          "spacing_box",
          "divider",
          "anchor",
          "bg_color",
          "inner_bg_color",
          "fg_color",
          "border_color",
          "border_width",
          "radius",
        ]),
      );
      expect(ids, type).not.toContain("background");
      // 同一个 id 只能声明一次，否则编辑器会渲染出两个控件
      expect(new Set(ids).size, type).toBe(ids.length);
    }
  });

  it("keeps header and footer on a single surface background", () => {
    for (const type of ["header", "footer"] as const) {
      const ids = BUILTIN_SECTION_DEFINITIONS[type].settings
        .map((def) => ("id" in def ? def.id : ""))
        .filter(Boolean);
      expect(ids, type).toContain("bg_color");
      expect(ids, type).not.toContain("inner_bg_color");
    }
  });

  it("resolves layout values with defaults and rejects unknown backgrounds", () => {
    expect(resolveSectionLayout(createSection("prose").settings)).toEqual({
      width: "page",
      contentWidth: "default",
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
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
    const prose = resolveSectionLayout(createSection("prose").settings);
    expect(hero.paddingTop).toBeGreaterThan(prose.paddingTop);
    expect(hero.paddingBottom).toBeGreaterThan(prose.paddingBottom);
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
      innerBackgroundColor: null,
      color: null,
      borderColor: null,
      borderWidth: 0,
      borderRadius: null,
    });
    expect(
      resolveSurfaceStyle({
        bg_color: "#0f766e80",
        inner_bg_color: "#ffffff",
        fg_color: "#fff",
        border_color: "#00000033",
        border_width: 0,
        radius: 16,
      }),
    ).toEqual({
      backgroundColor: "#0f766e80",
      innerBackgroundColor: "#ffffff",
      color: "#fff",
      borderColor: "#00000033",
      borderWidth: 1,
      borderRadius: 16,
    });
  });

  it("preserves background tokens when no custom bg_color", () => {
    const defs = BUILTIN_SECTION_DEFINITIONS.band.settings;
    expect(parseSettingValues(defs, { background: "muted" }).background).toBe(
      "muted",
    );
    expect(parseSettingValues(defs, { background: "accent" }).background).toBe(
      "accent",
    );
    expect(
      parseSettingValues(defs, { background: "outline" }).background,
    ).toBeUndefined();
    expect(
      parseSettingValues(defs, { background: "muted", bg_color: "#112233" })
        .background,
    ).toBeUndefined();
  });

  it("seeds new band sections with a muted token background", () => {
    expect(createSection("band").settings.background).toBe("muted");
  });

  it("expands spacing_box into four paddings and vertical outer spacing", () => {
    const defs = BUILTIN_SECTION_DEFINITIONS.form.settings;
    expect(
      parseSettingValues(defs, {
        padding_top: 16,
        padding_right: 24,
        padding_left: 8,
      }),
    ).toMatchObject({
      padding_top: 16,
      padding_right: 24,
      padding_bottom: 0,
      padding_left: 8,
      spacing_above: -4,
      spacing_below: -4,
    });
    expect(
      resolveSectionLayout({
        padding_top: 16,
        padding_right: 24,
        padding_bottom: 8,
        padding_left: 4,
      }),
    ).toMatchObject({
      paddingTop: 16,
      paddingRight: 24,
      paddingBottom: 8,
      paddingLeft: 4,
    });
  });
});

describe("splitSettingsByScope", () => {
  it("puts layout and appearance in their own tabs and keeps copy in content", () => {
    for (const type of PAGE_SECTION_TYPES) {
      const { content, layout, appearance } = splitSettingsByScope(
        BUILTIN_SECTION_DEFINITIONS[type].settings,
      );
      const ids = (defs: typeof content) =>
        defs.map((def) => ("id" in def ? def.id : "")).filter(Boolean);
      expect(ids(layout), type).toEqual(
        expect.arrayContaining(["spacing_box", "width"]),
      );
      expect(ids(appearance), type).toEqual(
        expect.arrayContaining([
          "bg_color",
          "inner_bg_color",
          "fg_color",
          "radius",
        ]),
      );
      // 三边加起来仍是完整的一份，不丢字段
      expect(content.length + layout.length + appearance.length, type).toBe(
        BUILTIN_SECTION_DEFINITIONS[type].settings.length,
      );
      expect(ids(content), type).not.toContain("spacing_box");
      expect(ids(layout), type).not.toContain("bg_color");
      expect(ids(appearance), type).not.toContain("background");
    }
  });

  it("gives header and footer an appearance tab", () => {
    const headerScopes = splitSettingsByScope(
      BUILTIN_SECTION_DEFINITIONS.header.settings,
    );
    expect(headerScopes.appearance.length).toBeGreaterThan(0);
    // 版式下拉已经删掉了：排法由每个块自己的 row / align 决定，页头只剩外壳设置
    expect(headerScopes.layout.map((def) => ("id" in def ? def.id : ""))).toEqual(
      expect.arrayContaining(["sticky", "padding_top", "show_divider"]),
    );
    expect(
      headerScopes.layout.map((def) => ("id" in def ? def.id : "")),
    ).not.toContain("layout");
    expect(
      splitSettingsByScope(BUILTIN_SECTION_DEFINITIONS.footer.settings)
        .appearance.length,
    ).toBeGreaterThan(0);
  });

  it("puts page-header align in the layout tab", () => {
    const { content, layout } = splitSettingsByScope(
      BUILTIN_SECTION_DEFINITIONS["page-header"].settings,
    );
    const contentIds = content
      .map((def) => ("id" in def ? def.id : ""))
      .filter(Boolean);
    const layoutIds = layout
      .map((def) => ("id" in def ? def.id : ""))
      .filter(Boolean);
    expect(contentIds).not.toContain("align");
    expect(layoutIds).toContain("align");
    expect(layoutIds).toContain("width");
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
        type: "form",
        settings: {},
        blocks: [
          {
            type: "field",
            settings: { label: "姓名", type: "text", placeholder: "请输入" },
          },
        ],
      },
    ]);
    const [copied] = relocalizeSections(sections, "zh-CN", "en", "zh-CN");
    expect(copied!.blocks[0]!.settings.label).toEqual({
      __i18n: { "zh-CN": "姓名", en: "姓名" },
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

  it("读路径不连坐整个容器段：不认识的子段就地兜成占位", () => {
    const [group] = safeSections([
      groupWith([
        { type: "band", settings: { headline: "Fine" } },
        { type: "gallery", settings: {} },
        { type: "prose", settings: { body_md: "x" } },
      ]),
    ]);
    // 列里也可能装模块贡献的段，口径与顶层一致：不认识 ≠ 丢掉
    // （占位不渲染，但内容留着、位置也留着，见 unsupported-section.test.ts）
    expect(group!.blocks[0]!.sections?.map((s) => s.type)).toEqual([
      "band",
      "unsupported",
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

  it("列宽读成 12 栏份额，与列数对不上时等分回落", () => {
    expect(resolveGroupSpans("3:9", 2)).toEqual([3, 9]);
    expect(resolveGroupSpans("3:7:2", 3)).toEqual([3, 7, 2]);
    expect(resolveGroupSpans("2:4:3:3", 4)).toEqual([2, 4, 3, 3]);
    // 份额是两列、实际三列：按列数等分，总和仍是 12
    expect(resolveGroupSpans("3:9", 3)).toEqual([4, 4, 4]);
    expect(resolveGroupSpans("3:9", 1)).toEqual([12]);
    expect(resolveGroupSpans("zzz", 2)).toEqual([6, 6]);
    expect(resolveGroupSpans("3:9", 0)).toEqual([]);
    // 旧比例写法（加起来不是 12）不再认，按列数等分
    expect(resolveGroupSpans("1:3", 2)).toEqual([6, 6]);
    expect(resolveGroupSpans("1:2:1", 3)).toEqual([4, 4, 4]);
  });

  it("份额必须每列至少一栏且加起来正好一行", () => {
    expect(parseGroupSpans("3:7:2")).toEqual([3, 7, 2]);
    // 加起来不是 12 / 有 0 栏的列 / 不是整数：一律不认，交给回落
    expect(parseGroupSpans("3:7")).toEqual([]);
    expect(parseGroupSpans("0:12")).toEqual([]);
    expect(parseGroupSpans("6.5:5.5")).toEqual([]);
    expect(parseGroupSpans("")).toEqual([]);
  });

  it("加列从最宽那列匀一半，减列把宽度并进最后一列", () => {
    // 3:9 加一列 → 从 9 里匀出 4
    expect(refitGroupSpans("3:9", 2, 3)).toBe("3:5:4");
    // 3:7:2 减一列 → 留前两列，差额补给新的最后一列
    expect(refitGroupSpans("3:7:2", 3, 2)).toBe("3:9");
    // 匀不出来（最宽的那列只有 1 栏）就退回等分
    expect(refitGroupSpans("1:1:10", 3, 4)).toBe("1:1:5:5");
    expect(refitGroupSpans("6:6", 2, 1)).toBe("12");
  });

  it("groupColumns 带出列宽与列设置", () => {
    const [group] = parseSections([
      {
        type: "group",
        settings: { columns_layout: "3:9" },
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

  it("分隔线逐列独立：没开的列为 null，开了的列各带各的线型", () => {
    const [group] = parseSections([
      {
        type: "group",
        settings: { columns_layout: "3:7:2" },
        blocks: [
          { type: "column", settings: { show_divider: true } },
          {
            type: "column",
            settings: {
              show_divider: true,
              divider_style: "dashed",
              divider_width: 3,
              divider_color: "#0f766e80",
            },
          },
          // 线型填了但没开开关：不画
          { type: "column", settings: { divider_style: "dotted" } },
        ],
      },
    ]);
    const columns = groupColumns(group!);
    expect(columns[0]!.divider).toEqual({
      style: "solid",
      width: 1,
      color: null,
    });
    expect(columns[1]!.divider).toEqual({
      style: "dashed",
      width: 3,
      color: "#0f766e80",
    });
    expect(columns[2]!.divider).toBeNull();
    // 默认值不落 style，只有改过的那几项进 CSS 变量
    expect(groupColumnCss(columns[0]!)).toEqual({});
    expect(groupColumnCss(columns[1]!)).toEqual({
      "--grp-divider-style": "dashed",
      "--grp-divider-w": "3px",
      "--grp-divider-color": "#0f766e80",
    });
    expect(groupColumnCss(columns[2]!)).toEqual({});
  });

  it("脏线型回落实线，线宽兜到 1px", () => {
    const [group] = parseSections([
      {
        type: "group",
        settings: {},
        blocks: [
          {
            type: "column",
            settings: {
              show_divider: true,
              divider_style: "groove",
              divider_width: 0,
            },
          },
          { type: "column", settings: {} },
        ],
      },
    ]);
    expect(groupColumns(group!)[0]!.divider).toEqual({
      style: "solid",
      width: 1,
      color: null,
    });
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

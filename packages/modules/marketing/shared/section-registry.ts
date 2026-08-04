/**
 * Section 注册表 —— section / block 的**唯一真相源**。
 *
 * 覆盖面以「能配出默认官网的效果」为准：hero + 特性网格 + 步骤 + 规格表 +
 * 卡片 + 页面菜单 + 定价 + FAQ + 通栏 CTA，外加站点级的页头 / 页脚。
 *
 * 新增字段只改这里 + 两处渲染（`client/components/sections/`、`server/ssr-sections.ts`）。
 */

import type { SettingDef, SettingValues } from "./section-settings.js";

/** 页面级 section：可在 Theme Editor 里往页面上加。 */
export const PAGE_SECTION_TYPES = [
  "page-header",
  "hero",
  "feature-grid",
  "steps",
  "spec-list",
  "cards",
  "page-menu",
  "pricing",
  "faq",
  "prose",
  "group",
  "band",
] as const;

/** 站点级区域：出现在所有页面上，各自是一串 section。 */
export const AREA_SECTION_TYPES = ["header", "footer"] as const;

/** 段能落脚的地方：页面区块流，或页头 / 页脚区。 */
export const PLACEMENTS = ["page", "header", "footer"] as const;
export type Placement = (typeof PLACEMENTS)[number];

export type PageSectionType = (typeof PAGE_SECTION_TYPES)[number];
export type AreaSectionType = (typeof AREA_SECTION_TYPES)[number];
export type SectionType = PageSectionType | AreaSectionType;

export interface BlockDefinition {
  type: string;
  /** i18n key */
  label: string;
  settings: SettingDef[];
  /**
   * 容器 block：自身还持有一串子 section（`group` 的「列」）。
   * 嵌套只允许一层——容器里的子段不能再是容器段，见 `parsePageSection` 的深度闸门。
   */
  container?: true;
}

export interface SectionDefinition {
  type: SectionType;
  /** i18n key */
  label: string;
  /**
   * 这一段能放在哪些区域。页面区块 = `page`，页头 / 页脚区各是一个区域。
   *
   * 声明式：想让某个段既能当页面区块又能当公告条，在它的 `placements` 里多写一个
   * 区域名即可，编辑器的「添加区块」菜单与写入校验都跟着走，不用改任何分支代码。
   */
  placements: readonly Placement[];
  settings: SettingDef[];
  /** 声明后该 section 支持可重复子项。 */
  blocks?: BlockDefinition[];
  max_blocks?: number;
  /** 新建时预置的 blocks（对齐 Shopify preset）。 */
  preset_blocks?: Array<{ type: string; settings?: SettingValues }>;
}

/** 存储结构：section / block 都是 `{ id, type, settings }`。 */
export interface SiteBlock {
  id: string;
  type: string;
  settings: SettingValues;
  /** 仅 `container` block：列里装的子段。非容器 block 恒为 undefined。 */
  sections?: SiteSection[];
}

export interface SiteSection {
  id: string;
  type: SectionType;
  settings: SettingValues;
  blocks: SiteBlock[];
}

/* -------------------------------------------------------------------------- */
/* 复用片段                                                                    */
/* -------------------------------------------------------------------------- */

const ALIGN_OPTIONS = [
  { value: "left", label: "editor.option.align.left" },
  { value: "center", label: "editor.option.align.center" },
] as const;

/**
 * 宽度拆成两个正交维度，覆盖 Shopify / Webflow 那几种真实排版：
 *
 * | 色块 width | 正文 content_width | 效果                         |
 * | ---------- | ------------------ | ---------------------------- |
 * | page       | default            | 常规区块（默认）             |
 * | page       | narrow             | 文档正文、长文               |
 * | full       | default            | 通栏色带 + 居中正文（Dawn）  |
 * | full       | full               | 通栏大图 hero / 满屏媒体     |
 */
const WIDTH_OPTIONS = [
  { value: "page", label: "editor.option.width.page" },
  { value: "full", label: "editor.option.width.full" },
] as const;

const CONTENT_WIDTH_OPTIONS = [
  { value: "default", label: "editor.option.content_width.default" },
  { value: "narrow", label: "editor.option.content_width.narrow" },
  { value: "full", label: "editor.option.content_width.full" },
] as const;

/**
 * 段间距：默认继承主题的「区块间距」，需要时逐段覆盖。
 *
 * 和段内留白（padding）用同一种控件、同一个单位——租户面对的始终是
 * 「一根滑块 + 一个 px 数」，不用先分清哪个概念用档位、哪个用数值。
 * 最左一格是「继承」（哨兵负值，见 `allow_inherit`）。
 */
const SPACING_RANGE = {
  type: "range",
  min: -4,
  max: 96,
  step: 4,
  default: -4,
  unit: "editor.unit.px",
  allow_inherit: true,
} as const;

const BACKGROUND_OPTIONS = [
  { value: "none", label: "editor.option.background.none" },
  { value: "muted", label: "editor.option.background.muted" },
  { value: "accent", label: "editor.option.background.accent" },
  { value: "outline", label: "editor.option.background.outline" },
] as const;

/**
 * 容器段的列宽：一个比例预设，而不是每列自己填宽度。
 *
 * 比例总和恒定（12 栏），租户点不出「加起来不满一行」或「三列挤成一条」的坏版式；
 * 代价是列宽只能从这几档里选——真实排版需求（文档侧栏 1:3、图文 1:2、并排 1:1）都在里面。
 */
const GROUP_LAYOUT_OPTIONS = [
  { value: "1:1", label: "editor.option.columns_layout.1_1" },
  { value: "1:2", label: "editor.option.columns_layout.1_2" },
  { value: "2:1", label: "editor.option.columns_layout.2_1" },
  { value: "1:3", label: "editor.option.columns_layout.1_3" },
  { value: "3:1", label: "editor.option.columns_layout.3_1" },
  { value: "1:1:1", label: "editor.option.columns_layout.1_1_1" },
] as const;

/** 比例 → 12 栏制的列宽。 */
const GROUP_COLUMN_SPANS: Record<string, number[]> = {
  "1:1": [6, 6],
  "1:2": [4, 8],
  "2:1": [8, 4],
  "1:3": [3, 9],
  "3:1": [9, 3],
  "1:1:1": [4, 4, 4],
};

/**
 * 列宽解析（两处渲染共用）。
 *
 * 实际列数与比例声明的列数对不上时以**列数**为准回落——列是 block，租户随时能加减，
 * 而比例是另一个下拉；两者短暂不一致是常态，不能因此渲染出一行空白。
 */
export function resolveGroupSpans(
  columnsLayout: string,
  columnCount: number,
): number[] {
  if (columnCount <= 0) return [];
  if (columnCount === 1) return [12];
  const spans = GROUP_COLUMN_SPANS[columnsLayout];
  if (spans && spans.length === columnCount) return spans;
  // 等分：12 除不尽时（如 5 列）多出来的栏补给最后一列，总和仍是 12
  const base = Math.floor(12 / columnCount);
  return Array.from({ length: columnCount }, (_, index) =>
    index === columnCount - 1 ? 12 - base * (columnCount - 1) : base,
  );
}

const DIVIDER_OPTIONS = [
  { value: "none", label: "editor.option.divider.none" },
  { value: "top", label: "editor.option.divider.top" },
  { value: "bottom", label: "editor.option.divider.bottom" },
  { value: "both", label: "editor.option.divider.both" },
] as const;

/**
 * 所有页面 section 共有的布局设置（对齐 Shopify 的 section padding / color scheme）。
 *
 * 放在各自设置的**末尾**：编辑器里内容在前、版式在后。顺序按影响面从大到小：
 * 宽度 → 背景 → 段内留白 → 段间距 → 分隔线 → 锚点。
 *
 * 段内留白用 px range 而不是档位，理由同 Shopify——租户要的是能微调，不是选 S/M/L；
 * 这里存的是**桌面值**，窄屏由两处渲染统一按比例缩，避免手机上留白过大。
 */
export function layoutSettings(defaults?: {
  padding_top?: number;
  padding_bottom?: number;
  background?: string;
  content_width?: string;
}): SettingDef[] {
  return [
    { type: "header", content: "editor.group.section", group: "layout" },
    {
      type: "select",
      id: "width",
      label: "editor.setting.width",
      default: "page",
      options: WIDTH_OPTIONS,
    },
    {
      type: "select",
      id: "content_width",
      label: "editor.setting.content_width",
      default: defaults?.content_width ?? "default",
      options: CONTENT_WIDTH_OPTIONS,
      info: "editor.info.content_width",
    },
    {
      type: "select",
      id: "background",
      label: "editor.setting.background",
      default: defaults?.background ?? "none",
      options: BACKGROUND_OPTIONS,
    },
    {
      type: "range",
      id: "padding_top",
      label: "editor.setting.padding_top",
      min: 0,
      max: 120,
      step: 4,
      default: defaults?.padding_top ?? 0,
      unit: "editor.unit.px",
      info: "editor.info.padding",
    },
    {
      type: "range",
      id: "padding_bottom",
      label: "editor.setting.padding_bottom",
      min: 0,
      max: 120,
      step: 4,
      default: defaults?.padding_bottom ?? 0,
      unit: "editor.unit.px",
    },
    {
      ...SPACING_RANGE,
      id: "spacing_above",
      label: "editor.setting.spacing_above",
      info: "editor.info.spacing",
    },
    {
      ...SPACING_RANGE,
      id: "spacing_below",
      label: "editor.setting.spacing_below",
    },
    {
      type: "select",
      id: "divider",
      label: "editor.setting.divider",
      default: "none",
      options: DIVIDER_OPTIONS,
    },
    {
      type: "text",
      id: "anchor",
      // 直接进 HTML id，不是给人读的文案
      localizable: false,
      label: "editor.setting.anchor",
      placeholder: "pricing",
      info: "editor.info.anchor",
    },
  ];
}

/**
 * 按分组抬头把设置拆成「内容」与「版式」两组，供编辑器分页签渲染。
 *
 * 抬头之后、下一个抬头之前的设置项算同一组；没有抬头的开头部分算内容。
 * 归属由抬头自己的 `group` 声明，不靠匹配 i18n key——加 section 时不会漏。
 */
export function splitSettingsByScope(defs: SettingDef[]): {
  content: SettingDef[];
  layout: SettingDef[];
} {
  const content: SettingDef[] = [];
  const layout: SettingDef[] = [];
  let target = content;
  for (const def of defs) {
    if (def.type === "header") {
      target = def.group === "layout" ? layout : content;
    }
    target.push(def);
  }
  return { content, layout };
}

/** 主/次按钮成对出现，集中定义避免各 section 抄写。 */
function linkSettings(
  prefix: "primary" | "secondary",
  options?: {
    labelDefault?: string;
    hrefDefault?: string;
    hrefPlaceholder?: string;
  },
): SettingDef[] {
  return [
    {
      type: "text",
      id: `${prefix}_label`,
      label: `editor.setting.${prefix}_label`,
      ...(options?.labelDefault !== undefined
        ? { default: options.labelDefault }
        : {}),
    },
    {
      type: "url",
      id: `${prefix}_href`,
      label: `editor.setting.${prefix}_href`,
      placeholder: options?.hrefPlaceholder ?? "/pricing",
      ...(options?.hrefDefault !== undefined
        ? { default: options.hrefDefault }
        : {}),
    },
  ];
}

/** 区块抬头：标题 + 描述，几乎每个 section 都有。 */
function headingSettings(options?: { align?: boolean }): SettingDef[] {
  return [
    { type: "header", content: "editor.group.heading" },
    { type: "text", id: "heading", label: "editor.setting.heading" },
    {
      type: "textarea",
      id: "subheading",
      label: "editor.setting.subheading",
      rows: 2,
    },
    ...(options?.align
      ? ([
          {
            type: "select",
            id: "align",
            label: "editor.setting.align",
            default: "left",
            options: ALIGN_OPTIONS,
          },
        ] as SettingDef[])
      : []),
  ];
}

function columnsSetting(max: 3 | 4, fallback: number): SettingDef {
  return {
    type: "range",
    id: "columns",
    label: "editor.setting.columns",
    min: 2,
    max,
    step: 1,
    default: fallback,
    unit: "editor.unit.columns",
  };
}

/* -------------------------------------------------------------------------- */
/* 注册表                                                                      */
/* -------------------------------------------------------------------------- */

export const SECTION_DEFINITIONS: Record<SectionType, SectionDefinition> = {
  /* ---------------------------------------------------------------- 站点级 */

  header: {
    type: "header",
    label: "editor.sectionType.header",
    placements: ["header"],
    settings: [
      { type: "header", content: "editor.group.brand" },
      {
        type: "checkbox",
        id: "show_logo",
        label: "editor.setting.show_logo",
        default: true,
      },
      {
        type: "checkbox",
        id: "show_site_name",
        label: "editor.setting.show_site_name",
        default: true,
      },
      {
        type: "checkbox",
        id: "sticky",
        label: "editor.setting.sticky",
        default: true,
      },
      { type: "header", content: "editor.group.nav" },
      // 全站导航 = 已发布一级页面（父路径 `/`）；自定义 `nav_link` 块始终追加在后。
      {
        type: "checkbox",
        id: "show_site_nav",
        label: "editor.setting.show_site_nav",
        default: true,
        info: "editor.info.show_site_nav",
      },
      // 语言切换器是**站点级**开关（`theme_settings.show_locale_switcher`，
      // 在「站点设置」里），不在这里重复出现一个同名 section 设置。
      { type: "paragraph", content: "editor.info.locale_switcher_site" },
      { type: "header", content: "editor.group.buttons" },
      // 次按钮默认指向登录；关掉 = 清空 label/href（与 primary 同一套显隐规则）。
      ...linkSettings("secondary", {
        labelDefault: "Login",
        hrefDefault: "/login",
        hrefPlaceholder: "/login",
      }),
      ...linkSettings("primary"),
    ],
    max_blocks: 8,
    blocks: [
      {
        type: "nav_link",
        label: "editor.blockType.nav_link",
        settings: [
          {
            type: "text",
            id: "label",
            label: "editor.setting.label",
            default: "Link",
            required: true,
          },
          {
            type: "url",
            id: "href",
            label: "editor.setting.href",
            default: "/",
          },
        ],
      },
    ],
  },

  footer: {
    type: "footer",
    label: "editor.sectionType.footer",
    placements: ["footer"],
    settings: [
      {
        type: "checkbox",
        id: "show_logo",
        label: "editor.setting.show_logo",
        default: true,
      },
      {
        type: "textarea",
        id: "blurb",
        label: "editor.setting.blurb",
        rows: 2,
        info: "editor.info.footer_blurb",
      },
      {
        type: "text",
        id: "copyright",
        label: "editor.setting.copyright",
        info: "editor.info.copyright",
      },
    ],
    max_blocks: 24,
    blocks: [
      {
        type: "footer_link",
        label: "editor.blockType.footer_link",
        settings: [
          {
            type: "text",
            id: "group",
            label: "editor.setting.group",
            info: "editor.info.footer_group",
          },
          {
            type: "text",
            id: "label",
            label: "editor.setting.label",
            default: "Link",
            required: true,
          },
          {
            type: "url",
            id: "href",
            label: "editor.setting.href",
            default: "/",
          },
        ],
      },
    ],
  },

  /* ---------------------------------------------------------------- 页面级 */

  hero: {
    type: "hero",
    label: "editor.sectionType.hero",
    placements: ["page"],
    settings: [
      { type: "header", content: "editor.group.content" },
      { type: "text", id: "eyebrow", label: "editor.setting.eyebrow" },
      {
        type: "text",
        id: "headline",
        label: "editor.setting.headline",
        default: "Welcome",
        required: true,
      },
      {
        type: "textarea",
        id: "subhead",
        label: "editor.setting.subhead",
        rows: 3,
      },
      {
        type: "select",
        id: "align",
        label: "editor.setting.align",
        default: "left",
        options: ALIGN_OPTIONS,
      },
      {
        type: "checkbox",
        id: "show_glow",
        label: "editor.setting.show_glow",
        default: true,
      },
      { type: "header", content: "editor.group.buttons" },
      ...linkSettings("primary"),
      ...linkSettings("secondary"),
      ...layoutSettings({ padding_top: 48, padding_bottom: 64 }),
    ],
    max_blocks: 4,
    blocks: [
      {
        type: "stat",
        label: "editor.blockType.stat",
        settings: [
          {
            type: "text",
            id: "term",
            label: "editor.setting.stat_term",
            default: "Term",
            required: true,
          },
          { type: "text", id: "detail", label: "editor.setting.stat_detail" },
        ],
      },
    ],
  },

  "feature-grid": {
    type: "feature-grid",
    label: "editor.sectionType.feature-grid",
    placements: ["page"],
    settings: [
      ...headingSettings(),
      { type: "header", content: "editor.group.layout", group: "layout" },
      columnsSetting(4, 3),
      {
        type: "checkbox",
        id: "show_icons",
        label: "editor.setting.show_icons",
        default: true,
      },
      ...layoutSettings(),
    ],
    max_blocks: 12,
    preset_blocks: [
      { type: "feature" },
      { type: "feature" },
      { type: "feature" },
    ],
    blocks: [
      {
        type: "feature",
        label: "editor.blockType.feature",
        settings: [
          { type: "icon", id: "icon", label: "editor.setting.icon" },
          {
            type: "text",
            id: "title",
            label: "editor.setting.title",
            default: "Feature",
            required: true,
          },
          {
            type: "textarea",
            id: "body",
            label: "editor.setting.body",
            rows: 3,
          },
        ],
      },
    ],
  },

  steps: {
    type: "steps",
    label: "editor.sectionType.steps",
    placements: ["page"],
    settings: [
      ...headingSettings(),
      { type: "header", content: "editor.group.buttons" },
      ...linkSettings("primary"),
      { type: "header", content: "editor.group.layout", group: "layout" },
      columnsSetting(4, 3),
      {
        type: "checkbox",
        id: "show_number",
        label: "editor.setting.show_number",
        default: true,
      },
      ...layoutSettings(),
    ],
    max_blocks: 8,
    preset_blocks: [{ type: "step" }, { type: "step" }, { type: "step" }],
    blocks: [
      {
        type: "step",
        label: "editor.blockType.step",
        settings: [
          {
            type: "text",
            id: "title",
            label: "editor.setting.title",
            default: "Step",
            required: true,
          },
          {
            type: "textarea",
            id: "body",
            label: "editor.setting.body",
            rows: 3,
          },
          {
            type: "text",
            id: "code",
            // 命令 / 代码片段，不随语言变
            localizable: false,
            label: "editor.setting.code",
            info: "editor.info.code",
          },
        ],
      },
    ],
  },

  "spec-list": {
    type: "spec-list",
    label: "editor.sectionType.spec-list",
    placements: ["page"],
    settings: [
      ...headingSettings(),
      { type: "header", content: "editor.group.buttons" },
      ...linkSettings("primary"),
      { type: "header", content: "editor.group.layout", group: "layout" },
      {
        type: "select",
        id: "layout",
        label: "editor.setting.layout",
        default: "split",
        options: [
          { value: "split", label: "editor.option.layout.split" },
          { value: "stacked", label: "editor.option.layout.stacked" },
        ],
      },
      ...layoutSettings(),
    ],
    max_blocks: 12,
    preset_blocks: [{ type: "row" }, { type: "row" }],
    blocks: [
      {
        type: "row",
        label: "editor.blockType.row",
        settings: [
          {
            type: "text",
            id: "term",
            label: "editor.setting.term",
            default: "Layer",
            required: true,
          },
          { type: "text", id: "detail", label: "editor.setting.detail" },
        ],
      },
    ],
  },

  cards: {
    type: "cards",
    label: "editor.sectionType.cards",
    placements: ["page"],
    settings: [
      ...headingSettings(),
      { type: "header", content: "editor.group.layout", group: "layout" },
      columnsSetting(4, 3),
      {
        type: "select",
        id: "card_style",
        label: "editor.setting.card_style",
        default: "bordered",
        options: [
          { value: "bordered", label: "editor.option.card_style.bordered" },
          { value: "plain", label: "editor.option.card_style.plain" },
        ],
      },
      ...layoutSettings(),
    ],
    max_blocks: 12,
    preset_blocks: [{ type: "card" }],
    blocks: [
      {
        type: "card",
        label: "editor.blockType.card",
        settings: [
          {
            type: "text",
            id: "title",
            label: "editor.setting.title",
            default: "Item",
            required: true,
          },
          {
            type: "textarea",
            id: "body",
            label: "editor.setting.body",
            rows: 3,
          },
          {
            type: "url",
            id: "href",
            label: "editor.setting.href",
            placeholder: "/docs",
          },
        ],
      },
      {
        type: "stat",
        label: "editor.blockType.stat",
        settings: [
          {
            type: "text",
            id: "value",
            label: "editor.setting.stat_value",
            default: "99%",
            required: true,
          },
          { type: "text", id: "label", label: "editor.setting.stat_label" },
        ],
      },
    ],
  },

  /**
   * 动态页面菜单：条目来自已发布页面目录（`site.pages`），不是手填 blocks。
   * 父页用 `children`，子页用 `siblings`；插入 section 即出现，无 chrome 预设。
   */
  "page-menu": {
    type: "page-menu",
    label: "editor.sectionType.page-menu",
    placements: ["page"],
    settings: [
      ...headingSettings(),
      {
        type: "select",
        id: "source",
        label: "editor.setting.page_menu_source",
        default: "children",
        options: [
          {
            value: "children",
            label: "editor.option.page_menu_source.children",
          },
          {
            value: "siblings",
            label: "editor.option.page_menu_source.siblings",
          },
        ],
      },
      {
        type: "select",
        id: "style",
        label: "editor.setting.page_menu_style",
        default: "cards",
        options: [
          { value: "list", label: "editor.option.page_menu_style.list" },
          { value: "cards", label: "editor.option.page_menu_style.cards" },
        ],
      },
      { type: "header", content: "editor.group.layout", group: "layout" },
      columnsSetting(4, 2),
      ...layoutSettings(),
    ],
  },

  pricing: {
    type: "pricing",
    label: "editor.sectionType.pricing",
    placements: ["page"],
    settings: [
      ...headingSettings(),
      // 这两项是文案，留在内容页签；列数归版式
      {
        type: "text",
        id: "footnote",
        label: "editor.setting.footnote",
      },
      {
        type: "text",
        id: "featured_badge",
        label: "editor.setting.featured_badge",
      },
      { type: "header", content: "editor.group.layout", group: "layout" },
      columnsSetting(4, 3),
      ...layoutSettings(),
    ],
    max_blocks: 6,
    preset_blocks: [{ type: "plan" }, { type: "plan" }, { type: "plan" }],
    blocks: [
      {
        type: "plan",
        label: "editor.blockType.plan",
        settings: [
          {
            type: "text",
            id: "name",
            label: "editor.setting.plan_name",
            default: "Plan",
            required: true,
          },
          { type: "text", id: "audience", label: "editor.setting.audience" },
          { type: "text", id: "price", label: "editor.setting.price" },
          {
            type: "text",
            id: "price_note",
            label: "editor.setting.price_note",
          },
          {
            type: "list",
            id: "highlights",
            label: "editor.setting.highlights",
            rows: 5,
            info: "editor.info.one_per_line",
          },
          {
            type: "checkbox",
            id: "featured",
            label: "editor.setting.featured",
            default: false,
          },
          ...linkSettings("primary"),
        ],
      },
    ],
  },

  faq: {
    type: "faq",
    label: "editor.sectionType.faq",
    placements: ["page"],
    settings: [...headingSettings(), ...layoutSettings()],
    max_blocks: 20,
    preset_blocks: [{ type: "qa" }, { type: "qa" }],
    blocks: [
      {
        type: "qa",
        label: "editor.blockType.qa",
        settings: [
          {
            type: "text",
            id: "question",
            label: "editor.setting.question",
            default: "Question",
            required: true,
          },
          {
            type: "textarea",
            id: "answer",
            label: "editor.setting.answer",
            rows: 4,
          },
        ],
      },
    ],
  },

  /**
   * 页面标题段。
   *
   * 以前这块是**自动渲染**的（非首页且不以 hero 开场就出 h1），标题出不出现取决于
   * 第一段碰巧是什么类型——租户在编辑器里看不见它、也删不掉它。现在它就是一段普通
   * section：树上看得见、能排序、能删。
   *
   * 文案留空时回落到页面自己的标题 / 描述（`resolvePageHeaderText`），所以新建页面
   * 仍然自带 h1，租户也不用把标题抄两遍。
   */
  "page-header": {
    type: "page-header",
    label: "editor.sectionType.page-header",
    placements: ["page"],
    settings: [
      {
        type: "text",
        id: "headline",
        label: "editor.setting.headline",
        info: "editor.info.page_header_headline",
      },
      {
        type: "textarea",
        id: "subhead",
        label: "editor.setting.subhead",
        rows: 2,
        info: "editor.info.page_header_subhead",
      },
      {
        type: "select",
        id: "align",
        label: "editor.setting.align",
        default: "left",
        options: [
          { value: "left", label: "editor.option.align.left" },
          { value: "center", label: "editor.option.align.center" },
        ],
      },
      ...layoutSettings(),
    ],
  },

  prose: {
    type: "prose",
    label: "editor.sectionType.prose",
    // 页头 / 页脚里的自由文案（备案号、免责声明、公告正文）
    placements: ["page", "header", "footer"],
    settings: [
      {
        type: "richtext",
        id: "body_md",
        label: "editor.setting.body_md",
        rows: 14,
        info: "editor.info.markdown",
      },
      // width 已由 layoutSettings() 统一提供，这里不再单独声明
      ...layoutSettings(),
    ],
  },

  /**
   * 容器段：唯一的布局原语，一段里并排 2–3 列，每列装任意子段。
   *
   * 列是 block（增删排序、设置面板全部复用 block 那一套），列宽由 group 上的
   * 一个比例预设统一决定——比例总和恒定，租户配不出「加起来不足一行」的坏版式。
   * 「左侧 page-menu + 右侧正文」的文档版式就是 `1:3` 的一个用例，不再单独做特例。
   */
  group: {
    type: "group",
    label: "editor.sectionType.group",
    placements: ["page"],
    settings: [
      { type: "header", content: "editor.group.layout", group: "layout" },
      {
        type: "select",
        id: "columns_layout",
        label: "editor.setting.columns_layout",
        default: "1:3",
        options: GROUP_LAYOUT_OPTIONS,
        info: "editor.info.columns_layout",
      },
      {
        type: "range",
        id: "column_gap",
        label: "editor.setting.column_gap",
        min: 0,
        max: 96,
        step: 4,
        default: 40,
        unit: "editor.unit.px",
      },
      {
        type: "select",
        id: "align_items",
        label: "editor.setting.align_items",
        default: "start",
        options: [
          { value: "start", label: "editor.option.align_items.start" },
          { value: "stretch", label: "editor.option.align_items.stretch" },
        ],
      },
      ...layoutSettings(),
    ],
    max_blocks: 3,
    preset_blocks: [{ type: "column" }, { type: "column" }],
    blocks: [
      {
        type: "column",
        label: "editor.blockType.column",
        container: true,
        settings: [
          {
            type: "checkbox",
            id: "sticky",
            label: "editor.setting.sticky_column",
            default: false,
            info: "editor.info.sticky_column",
          },
          {
            type: "select",
            id: "stack_order",
            label: "editor.setting.stack_order",
            default: "auto",
            options: [
              { value: "auto", label: "editor.option.stack_order.auto" },
              { value: "first", label: "editor.option.stack_order.first" },
              { value: "last", label: "editor.option.stack_order.last" },
            ],
            info: "editor.info.stack_order",
          },
        ],
      },
    ],
  },

  band: {
    type: "band",
    label: "editor.sectionType.band",
    // 通栏 CTA 摆进页头区就是公告条，摆进页脚就是收尾行动号召——同一段，不另造类型
    placements: ["page", "header", "footer"],
    settings: [
      { type: "header", content: "editor.group.content" },
      {
        type: "text",
        id: "headline",
        label: "editor.setting.headline",
        default: "Headline",
        required: true,
      },
      { type: "textarea", id: "body", label: "editor.setting.body", rows: 3 },
      {
        type: "select",
        id: "align",
        label: "editor.setting.align",
        default: "center",
        options: ALIGN_OPTIONS,
      },
      { type: "header", content: "editor.group.buttons" },
      ...linkSettings("primary"),
      ...linkSettings("secondary"),
      // 底色走通用 background，band 不再自带一套同义的 tone
      ...layoutSettings({
        background: "muted",
        padding_top: 48,
        padding_bottom: 48,
      }),
    ],
  },
};

export function isPageSectionType(value: unknown): value is PageSectionType {
  return (
    typeof value === "string" &&
    (PAGE_SECTION_TYPES as readonly string[]).includes(value)
  );
}

/** 某个区域能放哪些段——编辑器的「添加区块」菜单与写入校验共用。 */
export function sectionTypesFor(placement: Placement): SectionType[] {
  return (Object.keys(SECTION_DEFINITIONS) as SectionType[]).filter((type) =>
    SECTION_DEFINITIONS[type].placements.includes(placement),
  );
}

export function isAreaSectionType(value: unknown): value is AreaSectionType {
  return (
    typeof value === "string" &&
    (AREA_SECTION_TYPES as readonly string[]).includes(value)
  );
}

export function getSectionDefinition(type: SectionType): SectionDefinition {
  return SECTION_DEFINITIONS[type];
}

/** 该 section 的 block 是否装子段（目前只有 `group` 的列）。 */
export function isContainerSection(type: SectionType): boolean {
  return Boolean(
    SECTION_DEFINITIONS[type].blocks?.some((def) => def.container),
  );
}

export function getBlockDefinition(
  sectionType: SectionType,
  blockType: string,
): BlockDefinition | undefined {
  return SECTION_DEFINITIONS[sectionType].blocks?.find(
    (block) => block.type === blockType,
  );
}

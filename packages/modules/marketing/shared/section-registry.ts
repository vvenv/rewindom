/**
 * Section 注册表 —— section / block 的**唯一真相源**。
 *
 * 覆盖面以「能配出默认官网的效果」为准：hero + 特性网格 + 步骤 + 规格表 +
 * 卡片 + 定价 + FAQ + 通栏 CTA，外加站点级的页头 / 页脚。
 *
 * 新增字段只改这里 + 两处渲染（`client/components/sections/`、`server/ssr-render.ts`）。
 */

import type { SettingDef, SettingValues } from "./section-settings.js";

/** 页面级 section：可在 Theme Editor 里往页面上加。 */
export const PAGE_SECTION_TYPES = [
  "hero",
  "feature-grid",
  "steps",
  "spec-list",
  "cards",
  "pricing",
  "faq",
  "prose",
  "split",
  "band",
] as const;

/** 站点级区域：每个站点各一个，出现在所有页面上。 */
export const AREA_SECTION_TYPES = ["header", "footer"] as const;

export type PageSectionType = (typeof PAGE_SECTION_TYPES)[number];
export type AreaSectionType = (typeof AREA_SECTION_TYPES)[number];
export type SectionType = PageSectionType | AreaSectionType;

export interface BlockDefinition {
  type: string;
  /** i18n key */
  label: string;
  settings: SettingDef[];
}

export interface SectionDefinition {
  type: SectionType;
  /** i18n key */
  label: string;
  scope: "page" | "site";
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
      default: defaults?.padding_top ?? 32,
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
      default: defaults?.padding_bottom ?? 32,
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
function linkSettings(prefix: "primary" | "secondary"): SettingDef[] {
  return [
    {
      type: "text",
      id: `${prefix}_label`,
      label: `editor.setting.${prefix}_label`,
    },
    {
      type: "url",
      id: `${prefix}_href`,
      label: `editor.setting.${prefix}_href`,
      placeholder: "/pricing",
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
    scope: "site",
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
      { type: "header", content: "editor.group.buttons" },
      {
        type: "checkbox",
        id: "show_login",
        label: "editor.setting.show_login",
        default: true,
      },
      { type: "text", id: "login_label", label: "editor.setting.login_label" },
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
    scope: "site",
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
    scope: "page",
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
    scope: "page",
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
    scope: "page",
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
    scope: "page",
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
    scope: "page",
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

  pricing: {
    type: "pricing",
    label: "editor.sectionType.pricing",
    scope: "page",
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
    scope: "page",
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

  prose: {
    type: "prose",
    label: "editor.sectionType.prose",
    scope: "page",
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

  split: {
    type: "split",
    label: "editor.sectionType.split",
    scope: "page",
    settings: [
      { type: "header", content: "editor.group.content" },
      {
        type: "text",
        id: "title",
        label: "editor.setting.title",
        default: "Title",
        required: true,
      },
      { type: "textarea", id: "body", label: "editor.setting.body", rows: 3 },
      {
        type: "richtext",
        id: "aside_md",
        label: "editor.setting.aside_md",
        rows: 8,
        info: "editor.info.markdown",
      },
      {
        type: "select",
        id: "media_position",
        label: "editor.setting.media_position",
        default: "end",
        options: [
          { value: "start", label: "editor.option.media_position.start" },
          { value: "end", label: "editor.option.media_position.end" },
        ],
      },
      { type: "header", content: "editor.group.buttons" },
      ...linkSettings("primary"),
      ...layoutSettings(),
    ],
  },

  band: {
    type: "band",
    label: "editor.sectionType.band",
    scope: "page",
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

export function isAreaSectionType(value: unknown): value is AreaSectionType {
  return (
    typeof value === "string" &&
    (AREA_SECTION_TYPES as readonly string[]).includes(value)
  );
}

export function getSectionDefinition(type: SectionType): SectionDefinition {
  return SECTION_DEFINITIONS[type];
}

export function getBlockDefinition(
  sectionType: SectionType,
  blockType: string,
): BlockDefinition | undefined {
  return SECTION_DEFINITIONS[sectionType].blocks?.find(
    (block) => block.type === blockType,
  );
}

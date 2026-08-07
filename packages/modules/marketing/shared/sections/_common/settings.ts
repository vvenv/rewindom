/**
 * Section 定义的复用片段：选项表、通用设置组、成对出现的字段。
 *
 * 各段的 `definition.ts` 从这里拼自己的 `settings`——同一个概念（宽度、留白、按钮）
 * 只有一处定义，加段时不会抄出十几种写法不一的「对齐」下拉。
 */

import type { SettingDef } from "../../section-settings.js";

export const ALIGN_OPTIONS = [
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
export const GROUP_LAYOUT_OPTIONS = [
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
 * 所有页面 section 共有的布局设置（对齐 Shopify 的 section padding）。
 *
 * 放在各自设置的**末尾**：编辑器里内容在前、版式 / 外观在后。版式按影响面从大到小：
 * 宽度 → 段内留白 → 段间距 → 分隔线 → 锚点；底色预设进外观页签（与 `bg_color` 成对）。
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
    // 底色预设只挂在页面 section：block / chrome 没有 sec-bg-* 渲染路径
    ...styleSettings(defaults, { withTokenBackground: true }),
  ];
}

/**
 * 通用外观设置（背景 / 前景 / 边框 / 圆角），对齐 Shopify color scheme 的可调部分。
 *
 * 编辑器「外观」页签：空颜色 = 不覆盖（继续走 token `background` 或主题默认）。
 * 块级（卡片等）也可单独挂这份声明，不必带整套留白；token 底色预设仅 section 开启。
 */
export function styleSettings(
  defaults?: {
    background?: string;
    bg_color?: string;
    fg_color?: string;
    border_color?: string;
    border_width?: number;
    radius?: number;
  },
  options?: { withTokenBackground?: boolean },
): SettingDef[] {
  return [
    { type: "header", content: "editor.group.appearance", group: "appearance" },
    ...(options?.withTokenBackground
      ? ([
          {
            type: "select",
            id: "background",
            label: "editor.setting.background",
            default: defaults?.background ?? "none",
            options: BACKGROUND_OPTIONS,
          },
        ] as SettingDef[])
      : []),
    {
      type: "color",
      id: "bg_color",
      label: "editor.setting.bg_color",
      default: defaults?.bg_color ?? "",
      allow_empty: true,
      allow_alpha: true,
      info: "editor.info.bg_color",
    },
    {
      type: "color",
      id: "fg_color",
      label: "editor.setting.fg_color",
      default: defaults?.fg_color ?? "",
      allow_empty: true,
      allow_alpha: true,
    },
    {
      type: "color",
      id: "border_color",
      label: "editor.setting.border_color",
      default: defaults?.border_color ?? "",
      allow_empty: true,
      allow_alpha: true,
    },
    {
      type: "range",
      id: "border_width",
      label: "editor.setting.border_width",
      min: 0,
      max: 8,
      step: 1,
      default: defaults?.border_width ?? 0,
      unit: "editor.unit.px",
      info: "editor.info.border_width",
    },
    {
      type: "range",
      id: "radius",
      label: "editor.setting.radius",
      min: -4,
      max: 48,
      step: 2,
      default: defaults?.radius ?? -4,
      unit: "editor.unit.px",
      allow_inherit: true,
      info: "editor.info.radius",
    },
  ];
}

/**
 * 按分组抬头把设置拆成「内容 / 版式 / 外观」三组，供编辑器分页签渲染。
 *
 * 抬头之后、下一个抬头之前的设置项算同一组；没有抬头的开头部分算内容。
 * 归属由抬头自己的 `group` 声明，不靠匹配 i18n key——加 section 时不会漏。
 */
export function splitSettingsByScope(defs: SettingDef[]): {
  content: SettingDef[];
  layout: SettingDef[];
  appearance: SettingDef[];
} {
  const content: SettingDef[] = [];
  const layout: SettingDef[] = [];
  const appearance: SettingDef[] = [];
  let target = content;
  for (const def of defs) {
    if (def.type === "header") {
      target =
        def.group === "layout"
          ? layout
          : def.group === "appearance"
            ? appearance
            : content;
    }
    target.push(def);
  }
  return { content, layout, appearance };
}

/** 主/次按钮成对出现，集中定义避免各 section 抄写。 */
export function linkSettings(
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
export function headingSettings(options?: { align?: boolean }): SettingDef[] {
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

export function columnsSetting(max: 3 | 4, fallback: number): SettingDef {
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

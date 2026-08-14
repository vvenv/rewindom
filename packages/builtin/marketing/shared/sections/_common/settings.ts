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

/** 容器段的栅格总宽：列宽都是它的整数份额。 */
export const GROUP_GRID = 12;

/** 等分；12 除不尽时（如 5 列）多出来的栏补给最后一列，总和仍是 12。 */
function evenSpans(columnCount: number): number[] {
  const base = Math.floor(GROUP_GRID / columnCount);
  return Array.from({ length: columnCount }, (_, index) =>
    index === columnCount - 1
      ? GROUP_GRID - base * (columnCount - 1)
      : base,
  );
}

/**
 * 列宽解析（两处渲染 + 编辑器共用）。
 *
 * 只认 12 栏份额（如 `"3:7:2"`，加起来正好 12）。解析不出或与列数对不上时
 * 按列数等分：列是 block、租户随时能加减，列宽是另一设置，两者短暂不一致是常态。
 */
export function resolveGroupSpans(
  columnsLayout: string,
  columnCount: number,
): number[] {
  if (columnCount <= 0) return [];
  if (columnCount === 1) return [GROUP_GRID];

  const parsed = parseGroupSpans(columnsLayout);
  if (parsed.length === columnCount) return parsed;

  return evenSpans(columnCount);
}

/**
 * `"3:7:2"` → `[3, 7, 2]`；不是一份合法份额就返回空数组。
 *
 * 合法 = 每列至少一栏、加起来正好一整行。宽松一点（比如自动补齐差额）只会让「存进去
 * 的」和「画出来的」不是一回事，而列宽恰恰是那种差一栏就看得出来的东西。
 */
export function parseGroupSpans(value: string): number[] {
  const parts = value.split(":");
  const spans = parts.map((part) => Number(part.trim()));
  if (spans.some((span) => !Number.isInteger(span) || span < 1)) return [];
  if (spans.reduce((sum, span) => sum + span, 0) !== GROUP_GRID) return [];
  return spans;
}

/** `[3, 7, 2]` → `"3:7:2"`。 */
export function formatGroupSpans(spans: readonly number[]): string {
  return spans.join(":");
}

/**
 * 加 / 删列之后该存的那份列宽。
 *
 * 不顺一遍的话，`resolveGroupSpans` 会因为「长度对不上」直接回落等分：租户刚调好的
 * 3:9 会在加第三列的瞬间变成 4:4:4，而他并没有碰过列宽。
 */
export function refitGroupSpans(
  value: string,
  previousCount: number,
  nextCount: number,
): string {
  return formatGroupSpans(
    fitGroupSpans(resolveGroupSpans(value, previousCount), nextCount),
  );
}

/** 列数变了之后的一份合法份额：能保住的比例尽量保住，保不住就等分。 */
export function fitGroupSpans(
  spans: readonly number[],
  columnCount: number,
): number[] {
  if (columnCount <= 0) return [];
  if (columnCount === 1) return [GROUP_GRID];
  if (spans.length === columnCount) return [...spans];
  /*
   * 加一列：从最宽的那列里匀出它的一半给新列——比整段推倒重来贴近租户的意图
   * （他刚往一个 3:9 的版式里加了一列，想要的多半是 3:5:4 而不是 4:4:4）。
   */
  if (spans.length === columnCount - 1 && spans.length > 0) {
    const widest = spans.indexOf(Math.max(...spans));
    const taken = Math.floor(spans[widest]! / 2);
    if (taken >= 1 && spans[widest]! - taken >= 1) {
      const next = [...spans];
      next[widest] = spans[widest]! - taken;
      next.push(taken);
      return next;
    }
  }
  // 减一列：把删掉那些列的宽度并进最后一列，其余保持原样
  if (spans.length > columnCount) {
    const kept = spans.slice(0, columnCount);
    const missing = GROUP_GRID - kept.reduce((sum, span) => sum + span, 0);
    kept[columnCount - 1] = kept[columnCount - 1]! + missing;
    return kept;
  }
  return evenSpans(columnCount);
}

const DIVIDER_OPTIONS = [
  { value: "none", label: "editor.option.divider.none" },
  { value: "top", label: "editor.option.divider.top" },
  { value: "bottom", label: "editor.option.divider.bottom" },
  { value: "both", label: "editor.option.divider.both" },
] as const;

/**
 * 正文在段内的排布（对齐等），排在版式页签最前、段外壳（宽度 / 留白）之前。
 */
export function contentLayoutSettings(options?: {
  alignDefault?: "left" | "center";
}): SettingDef[] {
  return [
    { type: "header", content: "editor.group.content_layout", group: "layout" },
    {
      type: "select",
      id: "align",
      label: "editor.setting.align",
      default: options?.alignDefault ?? "left",
      options: ALIGN_OPTIONS,
    },
  ];
}

/**
 * 所有页面 section 共有的布局设置（对齐 Shopify 的 section padding）。
 *
 * 放在各自设置的**末尾**：编辑器里内容在前、版式 / 外观在后。版式：
 * 宽度 → 盒模型留白（内四边 + 外上下）→ 分隔线 → 锚点。
 *
 * 段内留白用 px 而不是档位，理由同 Shopify——租户要的是能微调，不是选 S/M/L；
 * 这里存的是**桌面值**，窄屏由两处渲染统一按比例缩，避免手机上留白过大。
 */
export function layoutSettings(defaults?: {
  padding_top?: number;
  padding_right?: number;
  padding_bottom?: number;
  padding_left?: number;
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
      type: "spacing_box",
      id: "spacing_box",
      label: "editor.setting.spacing_box",
      info: "editor.info.spacing_box",
      padding: {
        top: defaults?.padding_top ?? 0,
        right: defaults?.padding_right ?? 0,
        bottom: defaults?.padding_bottom ?? 0,
        left: defaults?.padding_left ?? 0,
      },
      spacing: {
        above: -4,
        below: -4,
      },
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
    ...styleSettings(undefined, { withInnerBg: true }),
  ];
}

/**
 * 通用外观设置（背景 / 前景 / 边框 / 圆角），对齐 Shopify color scheme 的可调部分。
 *
 * 编辑器「外观」页签：空颜色 = 不覆盖。页面 section 另开「外 / 内」两层背景
 * （色块 vs 正文区）；块级 / chrome 只有一层 `bg_color`。
 */
export function styleSettings(
  defaults?: {
    bg_color?: string;
    inner_bg_color?: string;
    fg_color?: string;
    border_color?: string;
    border_width?: number;
    radius?: number;
  },
  options?: { withInnerBg?: boolean },
): SettingDef[] {
  const withInnerBg = options?.withInnerBg === true;
  return [
    { type: "header", content: "editor.group.appearance", group: "appearance" },
    {
      type: "color",
      id: "bg_color",
      label: withInnerBg
        ? "editor.setting.outer_bg_color"
        : "editor.setting.bg_color",
      default: defaults?.bg_color ?? "",
      allow_empty: true,
      allow_alpha: true,
      info: withInnerBg ? "editor.info.outer_bg_color" : "editor.info.bg_color",
    },
    ...(withInnerBg
      ? ([
          {
            type: "color",
            id: "inner_bg_color",
            label: "editor.setting.inner_bg_color",
            default: defaults?.inner_bg_color ?? "",
            allow_empty: true,
            allow_alpha: true,
            info: "editor.info.inner_bg_color",
          },
        ] as SettingDef[])
      : []),
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
      // 站内地址从下拉里选（页面 / 文档），外链手填——与导航链接同一个控件
      type: "link",
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
export function headingSettings(options?: {
  align?: boolean;
  /** 与预设 `text.heading` 同一条 `ns:key`，复制跨语言时才能换成目标语言库存句。 */
  headingDefault?: string;
  subheadingDefault?: string;
}): SettingDef[] {
  return [
    { type: "header", content: "editor.group.heading" },
    {
      type: "text",
      id: "heading",
      label: "editor.setting.heading",
      ...(options?.headingDefault ? { default: options.headingDefault } : {}),
    },
    {
      type: "textarea",
      id: "subheading",
      label: "editor.setting.subheading",
      rows: 2,
      ...(options?.subheadingDefault
        ? { default: options.subheadingDefault }
        : {}),
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

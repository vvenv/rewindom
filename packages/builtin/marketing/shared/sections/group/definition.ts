import { layoutSettings, styleSettings } from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

/**
 * 容器段：唯一的布局原语，一段里并排 2–4 列，每列装任意子段。
 *
 * 列是 block（增删排序、设置面板全部复用 block 那一套），列宽是 group 上的一份
 * 12 栏份额（`columns_layout`，如 `"3:9"`）——总和恒为一整行，租户配不出「加起来
 * 不足一行」的坏版式，但每一栏占多少可以自己拖。「左侧 page-menu + 右侧正文」的
 * 文档版式就是 `3:9` 的一个用例，不再单独做特例。
 */
export const groupSection: SectionDefinition = {
  type: "group",
  label: "editor.sectionType.group",
  placements: ["page"],
  settings: [
    { type: "header", content: "editor.group.layout", group: "layout" },
    {
      type: "column_spans",
      id: "columns_layout",
      label: "editor.setting.columns_layout",
      default: "3:9",
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
  // 4 列已经是一行里还读得下去的上限；再多就该换成 `cards` 那类网格段了
  max_blocks: 4,
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
        /*
         * 分隔线是**逐列**的：开关与线型都挂在列上，一段里可以只在某一处分栏点
         * 画线、几条线还能各画各的（左侧目录用实线、正文与右栏之间用虚线）。
         * 放在 group 上就只能「全画或全不画」，而分栏点本来就属于列。
         */
        {
          type: "checkbox",
          id: "show_divider",
          label: "editor.setting.column_divider",
          default: false,
          info: "editor.info.column_divider",
        },
        {
          type: "select",
          id: "divider_style",
          label: "editor.setting.divider_style",
          default: "solid",
          options: [
            { value: "solid", label: "editor.option.divider_style.solid" },
            { value: "dashed", label: "editor.option.divider_style.dashed" },
            { value: "dotted", label: "editor.option.divider_style.dotted" },
          ],
        },
        {
          type: "range",
          id: "divider_width",
          label: "editor.setting.divider_width",
          min: 1,
          max: 8,
          step: 1,
          default: 1,
          unit: "editor.unit.px",
        },
        {
          type: "color",
          id: "divider_color",
          label: "editor.setting.divider_color",
          default: "",
          allow_empty: true,
          allow_alpha: true,
          info: "editor.info.divider_color",
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
        ...styleSettings(),
      ],
    },
  ],
};

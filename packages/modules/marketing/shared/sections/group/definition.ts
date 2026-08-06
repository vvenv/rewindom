import {
  GROUP_LAYOUT_OPTIONS,
  layoutSettings,
  styleSettings,
} from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

/**
 * 容器段：唯一的布局原语，一段里并排 2–3 列，每列装任意子段。
 *
 * 列是 block（增删排序、设置面板全部复用 block 那一套），列宽由 group 上的
 * 一个比例预设统一决定——比例总和恒定，租户配不出「加起来不足一行」的坏版式。
 * 「左侧 page-menu + 右侧正文」的文档版式就是 `1:3` 的一个用例，不再单独做特例。
 */
export const groupSection: SectionDefinition = {
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
        ...styleSettings(),
      ],
    },
  ],
};

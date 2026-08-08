import {
  headingSettings,
  layoutSettings,
  linkSettings,
  styleSettings,
} from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

export const specListSection: SectionDefinition = {
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
        ...styleSettings(),
      ],
    },
  ],
};

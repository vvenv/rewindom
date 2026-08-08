import {
  columnsSetting,
  headingSettings,
  layoutSettings,
  linkSettings,
  styleSettings,
} from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

export const stepsSection: SectionDefinition = {
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
        ...styleSettings(),
      ],
    },
  ],
};

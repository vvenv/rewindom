import {
  columnsSetting,
  headingSettings,
  layoutSettings,
  styleSettings,
} from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

export const featureGridSection: SectionDefinition = {
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
  preset_blocks: [{ type: "feature" }, { type: "feature" }, { type: "feature" }],
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
        ...styleSettings(),
      ],
    },
  ],
};

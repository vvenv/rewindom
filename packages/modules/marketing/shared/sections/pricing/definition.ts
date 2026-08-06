import {
  columnsSetting,
  headingSettings,
  layoutSettings,
  linkSettings,
  styleSettings,
} from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

export const pricingSection: SectionDefinition = {
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
        ...styleSettings(),
      ],
    },
  ],
};

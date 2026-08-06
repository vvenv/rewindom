import {
  columnsSetting,
  headingSettings,
  layoutSettings,
  styleSettings,
} from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

export const cardsSection: SectionDefinition = {
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
        ...styleSettings(),
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
        ...styleSettings(),
      ],
    },
  ],
};

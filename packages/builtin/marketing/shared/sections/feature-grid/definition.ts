import {
  columnsSetting,
  headingSettings,
  layoutSettings,
} from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

/**
 * 卖点网格：图标 + 标题 + 说明，2–4 列。落地页最常用的视觉积木。
 */
export const featureGridSection: SectionDefinition = {
  type: "feature-grid",
  label: "editor.sectionType.feature-grid",
  placements: ["page"],
  settings: [
    ...headingSettings({
      headingDefault: "marketing:storefront.features.heading",
    }),
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
    {
      type: "checkbox",
      id: "show_icons",
      label: "editor.setting.show_icons",
      default: true,
    },
    { type: "header", content: "editor.group.layout", group: "layout" },
    columnsSetting(4, 3),
    ...layoutSettings({ padding_top: 48, padding_bottom: 48 }),
  ],
  max_blocks: 12,
  preset_blocks: [
    { type: "feature", settings: { icon: "Sparkles" } },
    { type: "feature", settings: { icon: "Layers" } },
    { type: "feature", settings: { icon: "Rocket" } },
  ],
  blocks: [
    {
      type: "feature",
      label: "editor.blockType.feature",
      settings: [
        {
          type: "icon",
          id: "icon",
          label: "editor.setting.icon",
          default: "Sparkles",
        },
        {
          type: "text",
          id: "title",
          label: "editor.setting.title",
          default: "marketing:storefront.features.itemTitle",
          required: true,
        },
        {
          type: "textarea",
          id: "body",
          label: "editor.setting.body",
          rows: 3,
          default: "marketing:storefront.features.itemBody",
        },
        {
          type: "link",
          id: "href",
          label: "editor.setting.href",
          placeholder: "/docs",
        },
      ],
    },
  ],
};

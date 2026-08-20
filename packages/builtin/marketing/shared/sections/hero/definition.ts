import {
  ALIGN_OPTIONS,
  LAYOUT_OPTIONS,
  layoutSettings,
  linkSettings,
  MEDIA_SIDE_OPTIONS,
  styleSettings,
} from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

export const heroSection: SectionDefinition = {
  type: "hero",
  label: "editor.sectionType.hero",
  placements: ["page"],
  settings: [
    { type: "header", content: "editor.group.content" },
    { type: "text", id: "eyebrow", label: "editor.setting.eyebrow" },
    {
      type: "text",
      id: "headline",
      label: "editor.setting.headline",
      default: "marketing:storefront.hero.headline",
      required: true,
    },
    {
      type: "textarea",
      id: "subhead",
      label: "editor.setting.subhead",
      rows: 3,
    },
    {
      type: "select",
      id: "align",
      label: "editor.setting.align",
      default: "left",
      options: ALIGN_OPTIONS,
    },
    {
      type: "select",
      id: "layout",
      label: "editor.setting.layout",
      default: "stacked",
      options: LAYOUT_OPTIONS,
      info: "editor.info.hero_layout",
    },
    {
      type: "image",
      id: "image",
      label: "editor.setting.image",
      info: "editor.info.hero_image",
    },
    {
      type: "text",
      id: "image_alt",
      label: "editor.setting.image_alt",
    },
    {
      type: "select",
      id: "media_side",
      label: "editor.setting.media_side",
      default: "right",
      options: MEDIA_SIDE_OPTIONS,
    },
    {
      type: "checkbox",
      id: "show_glow",
      label: "editor.setting.show_glow",
      default: true,
    },
    { type: "header", content: "editor.group.buttons" },
    ...linkSettings("primary"),
    ...linkSettings("secondary"),
    ...layoutSettings({ padding_top: 48, padding_bottom: 64 }),
  ],
  max_blocks: 4,
  blocks: [
    {
      type: "stat",
      label: "editor.blockType.stat",
      settings: [
        {
          type: "text",
          id: "term",
          label: "editor.setting.stat_term",
          default: "marketing:storefront.hero.statTerm",
          required: true,
        },
        { type: "text", id: "detail", label: "editor.setting.stat_detail" },
        ...styleSettings(),
      ],
    },
  ],
};

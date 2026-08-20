import {
  headingSettings,
  layoutSettings,
  linkSettings,
  MEDIA_SIDE_OPTIONS,
} from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

/**
 * 图文分栏：一侧主张与按钮，一侧图片或强调卡。没有图时用强调卡撑住版式，
 * 不必先上传媒体才能配出好看的页。
 */
export const splitSection: SectionDefinition = {
  type: "split",
  label: "editor.sectionType.split",
  placements: ["page"],
  settings: [
    ...headingSettings({
      headingDefault: "marketing:storefront.split.heading",
    }),
    {
      type: "textarea",
      id: "body",
      label: "editor.setting.body",
      rows: 4,
      default: "marketing:storefront.split.body",
    },
    {
      type: "image",
      id: "image",
      label: "editor.setting.image",
      info: "editor.info.split_image",
    },
    {
      type: "text",
      id: "image_alt",
      label: "editor.setting.image_alt",
    },
    {
      type: "richtext",
      id: "panel_md",
      label: "editor.setting.panel_md",
      rows: 6,
      default: "marketing:storefront.split.panel",
      info: "editor.info.split_panel",
    },
    {
      type: "select",
      id: "media_side",
      label: "editor.setting.media_side",
      default: "right",
      options: MEDIA_SIDE_OPTIONS,
    },
    { type: "header", content: "editor.group.buttons" },
    ...linkSettings("primary"),
    ...linkSettings("secondary"),
    ...layoutSettings({ padding_top: 48, padding_bottom: 48 }),
  ],
};

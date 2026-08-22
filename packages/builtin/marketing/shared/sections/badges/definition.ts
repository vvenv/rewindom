import {
  contentLayoutSettings,
  headingSettings,
  layoutSettings,
} from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

/**
 * 第三方目录 badge：一张外链图 + 一条外链，可重复。
 *
 * Product Hunt / NewTool 这类站点发的是「Featured on」SVG，不是页头那排 2rem
 * 图标。摆进页面或页脚，高度默认 54px（目录站 snippet 的惯用值）。
 */
export const badgesSection: SectionDefinition = {
  type: "badges",
  label: "editor.sectionType.badges",
  // 页脚放「收录于」一排、首页放 logo 墙，同一段
  placements: ["page", "header", "footer"],
  settings: [
    ...headingSettings(),
    ...contentLayoutSettings({ alignDefault: "center" }),
    {
      type: "range",
      id: "height",
      label: "editor.setting.badge_height",
      min: 32,
      max: 80,
      step: 2,
      default: 54,
      unit: "editor.unit.px",
      info: "editor.info.badge_height",
    },
    ...layoutSettings({ padding_top: 24, padding_bottom: 24 }),
  ],
  max_blocks: 12,
  preset_blocks: [{ type: "badge" }],
  blocks: [
    {
      type: "badge",
      label: "editor.blockType.badge",
      settings: [
        {
          type: "image",
          id: "image",
          label: "editor.setting.image",
          placeholder: "https://example.com/badge.svg",
          info: "editor.info.badge_image",
        },
        {
          type: "image",
          id: "image_dark",
          label: "editor.setting.image_dark",
          placeholder: "https://example.com/badge-dark.svg",
          info: "editor.info.badge_image_dark",
        },
        {
          type: "link",
          id: "href",
          label: "editor.setting.href",
          placeholder: "https://example.com/item/your-product",
          info: "editor.info.badge_href",
        },
        {
          type: "text",
          id: "alt",
          label: "editor.setting.image_alt",
          info: "editor.info.badge_alt",
        },
      ],
    },
  ],
};

import {
  contentLayoutSettings,
  headingSettings,
  layoutSettings,
} from "../_common/settings.js";
import { MARKETING_SECTION_GROUP, type SectionDefinition } from "../types.js";

/**
 * 第三方目录 badge：一张外链图 + 一条外链，可重复。
 *
 * Product Hunt / NewTool 这类站点发的是「Featured on」SVG，不是页头那排 2rem
 * 图标。摆进页面或页脚，高度固定 32px（宣传图，不是工具栏控件）。
 */
export const badgesSection: SectionDefinition = {
  type: "badges",
  label: "editor.sectionType.badges",
  group: MARKETING_SECTION_GROUP,
  // 页脚放「收录于」一排、首页放 logo 墙，同一段
  placements: ["page", "header", "footer"],
  settings: [
    ...headingSettings(),
    ...contentLayoutSettings({ alignDefault: "center" }),
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

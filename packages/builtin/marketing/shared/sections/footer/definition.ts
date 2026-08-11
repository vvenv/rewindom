import { styleSettings } from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

export const footerSection: SectionDefinition = {
  type: "footer",
  label: "editor.sectionType.footer",
  placements: ["footer"],
  settings: [
    {
      type: "checkbox",
      id: "show_logo",
      label: "editor.setting.show_logo",
      default: false,
    },
    {
      type: "textarea",
      id: "blurb",
      label: "editor.setting.blurb",
      rows: 2,
      info: "editor.info.footer_blurb",
    },
    {
      type: "text",
      id: "copyright",
      label: "editor.setting.copyright",
      info: "editor.info.copyright",
    },
    ...styleSettings(),
  ],
  /*
   * 页脚的一列 = 自己的标题 + 自己的导航条目。
   *
   * 不再引用外部菜单 key；要和页头一样时，在编辑器里「从页头复制」。
   */
  max_blocks: 6,
  blocks: [
    {
      type: "menu_column",
      label: "editor.blockType.menu_column",
      settings: [
        {
          type: "text",
          id: "title",
          label: "editor.setting.column_title",
          info: "editor.info.column_title",
        },
        {
          type: "nav_items",
          id: "items",
          label: "editor.setting.menu",
          default: [],
          copy_from_header: true,
        },
      ],
    },
  ],
};

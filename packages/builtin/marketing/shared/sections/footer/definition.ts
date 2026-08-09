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
      default: true,
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
   * 页脚的一列 = 一个菜单。
   *
   * 以前是一堆 `footer_link` 块，靠一个**自由文本** `group` 字段分列：打错一个字
   * 就凭空多出一列，列的顺序还只能按「哪一条先出现」，想整列换位置得把里面每条
   * 链接的 group 都改一遍。现在列就是列，拖一下就换位；而且页脚能直接引用页头
   * 那个菜单，不必把同一批链接抄第二遍。
   */
  max_blocks: 6,
  blocks: [
    {
      type: "menu_column",
      label: "editor.blockType.menu_column",
      settings: [
        {
          type: "menu",
          id: "menu",
          label: "editor.setting.menu",
        },
        {
          type: "text",
          id: "title",
          label: "editor.setting.column_title",
          info: "editor.info.column_title",
        },
      ],
    },
  ],
};

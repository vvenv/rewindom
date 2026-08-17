import {
  columnsSetting,
  headingSettings,
  layoutSettings,
} from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

/**
 * 动态页面菜单：条目来自已发布页面目录（`site.pages`），不是手填 blocks。
 * 父页用 `children`，子页用 `siblings`；插入 section 即出现，无 chrome 预设。
 */
export const pageMenuSection: SectionDefinition = {
  type: "page-menu",
  label: "editor.sectionType.page-menu",
  placements: ["page"],
  settings: [
    ...headingSettings(),
    {
      type: "select",
      id: "source",
      label: "editor.setting.page_menu_source",
      default: "children",
      options: [
        {
          value: "children",
          label: "editor.option.page_menu_source.children",
        },
        {
          value: "siblings",
          label: "editor.option.page_menu_source.siblings",
        },
      ],
    },
    {
      type: "select",
      id: "style",
      label: "editor.setting.page_menu_style",
      default: "cards",
      options: [
        { value: "list", label: "editor.option.page_menu_style.list" },
        { value: "cards", label: "editor.option.page_menu_style.cards" },
      ],
    },
    { type: "header", content: "editor.group.layout", group: "layout" },
    columnsSetting(4, 2),
    ...layoutSettings({ padding_top: 48, padding_bottom: 48 }),
  ],
};

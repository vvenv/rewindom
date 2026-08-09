import { defaultHeaderNavItems } from "../../site-nav.js";
import { linkSettings, styleSettings } from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

export const headerSection: SectionDefinition = {
  type: "header",
  label: "editor.sectionType.header",
  placements: ["header"],
  settings: [
    { type: "header", content: "editor.group.brand" },
    {
      type: "checkbox",
      id: "show_logo",
      label: "editor.setting.show_logo",
      default: true,
    },
    {
      type: "checkbox",
      id: "show_site_name",
      label: "editor.setting.show_site_name",
      default: true,
    },
    {
      type: "checkbox",
      id: "sticky",
      label: "editor.setting.sticky",
      default: true,
    },
    { type: "header", content: "editor.group.headerItems" },
    /*
     * 导航条目直接写在页头 settings 里。
     *
     * 以前是「菜单实体 + key 引用」：同一批链接要页脚共用就得先理解菜单库。
     * 现在页头就是页头；页脚列要一样时复制一份 items。
     */
    {
      type: "nav_items",
      id: "items",
      label: "editor.setting.header_menu",
      default: defaultHeaderNavItems(),
      info: "editor.info.header_menu",
    },
    {
      type: "checkbox",
      id: "show_locale_switcher",
      label: "editor.setting.show_locale_switcher",
      default: false,
      info: "editor.info.show_locale_switcher",
    },
    {
      type: "checkbox",
      id: "show_doc_search",
      label: "editor.setting.show_doc_search",
      default: true,
      info: "editor.info.show_doc_search",
    },
    {
      type: "checkbox",
      id: "show_theme_toggle",
      label: "editor.setting.show_theme_toggle",
      default: false,
      info: "editor.info.show_theme_toggle",
    },
    {
      type: "checkbox",
      id: "show_account",
      label: "editor.setting.show_account",
      default: true,
      info: "editor.info.show_account",
    },
    { type: "header", content: "editor.group.buttons" },
    ...linkSettings("secondary"),
    ...linkSettings("primary"),
    ...styleSettings(),
  ],
};

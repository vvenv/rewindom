import { layoutSettings } from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

/**
 * 文档导航菜单：整个文档库的目录（按分类分组），当前篇高亮。
 *
 * 「导航菜单要不要显示」在这套体系里就是「这一段加不加」——不需要再给别处开一个
 * 开关。放进 `group` 的窄列就是经典的文档左侧栏，放页脚就是一列文档快捷入口。
 */
export const docNavSection: SectionDefinition = {
  type: "doc-nav",
  label: "editor.sectionType.doc-nav",
  placements: ["page", "footer"],
  settings: [
    { type: "text", id: "heading", label: "editor.setting.heading" },
    {
      type: "checkbox",
      id: "show_category",
      label: "editor.setting.doc_nav_show_category",
      default: true,
    },
    {
      /*
       * 侧栏跟随滚动。只在「宽到能并排」的断点生效——手机上是上下堆叠的，
       * 粘一个目录在顶上会把正文挤没（见 styles.css 的媒体查询）。
       */
      type: "checkbox",
      id: "sticky",
      label: "editor.setting.doc_nav_sticky",
      default: true,
      info: "editor.info.doc_nav_sticky",
    },
    ...layoutSettings(),
  ],
};

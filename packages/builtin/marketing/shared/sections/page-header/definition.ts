import { ALIGN_OPTIONS, layoutSettings } from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

/**
 * 页面标题段。
 *
 * 以前这块是**自动**渲染的（非首页且不以 hero 开场就出 h1），标题出不出现取决于
 * 第一段碰巧是什么类型——租户在编辑器里看不见它、也删不掉它。现在它就是一段普通
 * section：树上看得见、能排序、能删。
 *
 * 文案不在这一段里改——h1 / 副标题始终用页面设置里的标题 / 描述
 * （`resolvePageHeaderText`），浏览器标签、搜索结果、页面菜单共用同一份。
 * 这一段只负责显隐与版式。
 */
export const pageHeaderSection: SectionDefinition = {
  type: "page-header",
  label: "editor.sectionType.page-header",
  placements: ["page"],
  settings: [
    {
      type: "header",
      content: "editor.group.content_layout",
      group: "layout",
    },
    {
      type: "checkbox",
      id: "show_header",
      label: "editor.setting.show_page_header",
      default: true,
      info: "editor.info.show_page_header",
    },
    {
      type: "select",
      id: "align",
      label: "editor.setting.align",
      default: "left",
      options: ALIGN_OPTIONS,
    },
    ...layoutSettings({
      padding_top: 48,
      padding_bottom: 24,
    }),
  ],
};

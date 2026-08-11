import { contentLayoutSettings, layoutSettings } from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

/**
 * 页面标题段。
 *
 * 以前这块是**自动渲染**的（非首页且不以 hero 开场就出 h1），标题出不出现取决于
 * 第一段碰巧是什么类型——租户在编辑器里看不见它、也删不掉它。现在它就是一段普通
 * section：树上看得见、能排序、能删。
 *
 * 文案留空时回落到页面自己的标题 / 描述（`resolvePageHeaderText`），所以新建页面
 * 仍然自带 h1，租户也不用把标题抄两遍。
 */
export const pageHeaderSection: SectionDefinition = {
  type: "page-header",
  label: "editor.sectionType.page-header",
  placements: ["page"],
  settings: [
    {
      type: "checkbox",
      id: "show_header",
      label: "editor.setting.show_page_header",
      default: true,
      info: "editor.info.show_page_header",
    },
    { type: "header", content: "editor.group.content" },
    {
      type: "text",
      id: "headline",
      label: "editor.setting.headline",
      info: "editor.info.page_header_headline",
    },
    {
      type: "textarea",
      id: "subhead",
      label: "editor.setting.subhead",
      rows: 2,
      info: "editor.info.page_header_subhead",
    },
    ...contentLayoutSettings(),
    ...layoutSettings({
      padding_top: 48,
      padding_bottom: 24,
    }),
  ],
};

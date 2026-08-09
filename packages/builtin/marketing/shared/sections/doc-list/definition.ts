import {
  columnsSetting,
  headingSettings,
  layoutSettings,
} from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

/**
 * 文档列表：条目来自租户文档库（`MarketingDoc`），不是手填 blocks。
 *
 * 与 `page-menu` 的关系是并列的——那个列的是**页面**目录，这个列的是**文档**目录。
 * 两者都靠渲染上下文取数，所以插进任何一页都能用：文档索引模板页放一个不限条数的，
 * 首页放一个 `limit=3` 的「最新文档」，是同一个段的两种配置。
 */
export const docListSection: SectionDefinition = {
  type: "doc-list",
  label: "editor.sectionType.doc-list",
  placements: ["page"],
  settings: [
    ...headingSettings(),
    {
      type: "select",
      id: "group_by",
      label: "editor.setting.doc_group_by",
      default: "category",
      options: [
        { value: "category", label: "editor.option.doc_group_by.category" },
        { value: "none", label: "editor.option.doc_group_by.none" },
      ],
    },
    {
      type: "select",
      id: "style",
      label: "editor.setting.doc_list_style",
      default: "cards",
      options: [
        { value: "cards", label: "editor.option.doc_list_style.cards" },
        { value: "list", label: "editor.option.doc_list_style.list" },
      ],
    },
    {
      // 存的是分类名原文（要和文档上填的那个字一致），不逐语言翻译
      type: "text",
      id: "category",
      localizable: false,
      label: "editor.setting.doc_category_filter",
      info: "editor.info.doc_category_filter",
    },
    {
      type: "range",
      id: "limit",
      label: "editor.setting.doc_limit",
      min: 0,
      max: 24,
      step: 1,
      default: 0,
      info: "editor.info.doc_limit",
    },
    {
      type: "checkbox",
      id: "show_description",
      label: "editor.setting.doc_show_description",
      default: true,
    },
    {
      type: "checkbox",
      id: "show_updated",
      label: "editor.setting.doc_show_updated",
      default: false,
    },
    { type: "header", content: "editor.group.layout", group: "layout" },
    columnsSetting(3, 2),
    ...layoutSettings(),
  ],
};

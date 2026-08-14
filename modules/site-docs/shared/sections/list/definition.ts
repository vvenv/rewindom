import { SITE_DOCS_ENTITLEMENT } from "../../entitlements.js";

import {
  columnsSetting,
  headingSettings,
  layoutSettings,
} from "../../../../../packages/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "../../../../../packages/builtin/marketing/shared/section-schema.js";

export const SITE_DOCS_LIST_SECTION_TYPE = "site-docs.list";

/**
 * 文档列表：条目来自站点文档库（`SiteDoc`），不是手填 blocks。
 *
 * 与 `page-menu` 的关系是并列的——那个列的是**页面**目录，这个列的是**文档**目录。
 * 两者都靠渲染上下文取数，所以插进任何一页都能用：文档索引模板页放一个不限条数的，
 * 首页放一个 `limit=3` 的「最新文档」，是同一个段的两种配置。
 */
export const siteDocsListSection: SectionDefinition = {
  type: SITE_DOCS_LIST_SECTION_TYPE,
  label: "site-docs:section.list.label",
  placements: ["page"],
  entitlement: SITE_DOCS_ENTITLEMENT.key,
  settings: [
    ...headingSettings(),
    {
      type: "select",
      id: "group_by",
      label: "site-docs:section.list.groupBy",
      default: "category",
      options: [
        {
          value: "category",
          label: "site-docs:section.list.groupByCategory",
        },
        { value: "none", label: "site-docs:section.list.groupByNone" },
      ],
    },
    {
      type: "select",
      id: "style",
      label: "site-docs:section.list.style",
      default: "cards",
      options: [
        { value: "cards", label: "site-docs:section.list.styleCards" },
        { value: "list", label: "site-docs:section.list.styleList" },
      ],
    },
    {
      type: "text",
      id: "category",
      localizable: false,
      label: "site-docs:section.list.categoryFilter",
      info: "site-docs:section.list.categoryFilterInfo",
    },
    {
      type: "range",
      id: "limit",
      label: "site-docs:section.list.limit",
      min: 0,
      max: 24,
      step: 1,
      default: 0,
      info: "site-docs:section.list.limitInfo",
    },
    {
      type: "checkbox",
      id: "show_description",
      label: "site-docs:section.list.showDescription",
      default: true,
    },
    {
      type: "checkbox",
      id: "show_updated",
      label: "site-docs:section.list.showUpdated",
      default: false,
    },
    { type: "header", content: "editor.group.layout", group: "layout" },
    columnsSetting(3, 2),
    ...layoutSettings(),
  ],
};

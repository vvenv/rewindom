import { SITE_DOCS_ENTITLEMENT } from "../../entitlements.js";
import { DOCS_ARTICLE_PAGE_KIND } from "../../page-kinds.js";

import { ALIGN_OPTIONS, layoutSettings } from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const SITE_DOCS_ARTICLE_SECTION_TYPE = "site-docs.article";

/**
 * 文档正文：渲染**当前正在看的那一篇**，内容来自站点文档库。
 *
 * 这一段自己不存内容，它是详情模板页上的一个占位——访客点开哪篇就渲哪篇。
 * 因此它只在文档详情模板页（`kind: docs_article`）上有东西可画。
 */
export const siteDocsArticleSection: SectionDefinition = {
  type: SITE_DOCS_ARTICLE_SECTION_TYPE,
  label: "site-docs:section.article.label",
  placements: ["page"],
  entitlement: SITE_DOCS_ENTITLEMENT.key,
  page_kinds: [DOCS_ARTICLE_PAGE_KIND],
  settings: [
    { type: "header", content: "site-docs:section.article.headingGroup" },
    {
      type: "checkbox",
      id: "show_title",
      label: "site-docs:section.article.showTitle",
      default: true,
      info: "site-docs:section.article.showTitleInfo",
    },
    {
      type: "checkbox",
      id: "show_description",
      label: "site-docs:section.article.showDescription",
      default: true,
    },
    {
      type: "select",
      id: "align",
      label: "editor.setting.align",
      default: "left",
      options: ALIGN_OPTIONS,
    },
    { type: "header", content: "site-docs:section.article.metaGroup" },
    {
      type: "checkbox",
      id: "show_category",
      label: "site-docs:section.article.showCategory",
      default: true,
    },
    {
      type: "checkbox",
      id: "show_updated",
      label: "site-docs:section.article.showUpdated",
      default: true,
    },
    {
      type: "select",
      id: "meta_position",
      label: "site-docs:section.article.metaPosition",
      default: "above",
      options: [
        {
          value: "above",
          label: "site-docs:section.article.metaAbove",
        },
        {
          value: "below",
          label: "site-docs:section.article.metaBelow",
        },
      ],
    },
    { type: "header", content: "site-docs:section.article.backGroup" },
    {
      type: "checkbox",
      id: "show_back",
      label: "site-docs:section.article.showBack",
      default: true,
    },
    {
      type: "text",
      id: "back_label",
      label: "site-docs:section.article.backLabel",
      info: "site-docs:section.article.backLabelInfo",
    },
    {
      type: "link",
      id: "back_href",
      label: "site-docs:section.article.backHref",
      placeholder: "/docs",
      info: "site-docs:section.article.backHrefInfo",
    },
    ...layoutSettings({ content_width: "narrow" }),
  ],
};

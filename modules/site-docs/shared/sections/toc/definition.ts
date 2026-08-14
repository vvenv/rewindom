import { SITE_DOCS_ENTITLEMENT } from "../../entitlements.js";
import { DOCS_ARTICLE_PAGE_KIND } from "../../page-kinds.js";

import { layoutSettings } from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const SITE_DOCS_TOC_SECTION_TYPE = "site-docs.toc";

/**
 * 文档内部的章节导航（"On this page"）：从当前文档的正文标题现抽。
 *
 * 与 `site-docs.nav` 的分工：那个是**篇与篇之间**的目录，这个是**一篇之内**。
 */
export const siteDocsTocSection: SectionDefinition = {
  type: SITE_DOCS_TOC_SECTION_TYPE,
  label: "site-docs:section.toc.label",
  placements: ["page"],
  entitlement: SITE_DOCS_ENTITLEMENT.key,
  page_kinds: [DOCS_ARTICLE_PAGE_KIND],
  settings: [
    { type: "text", id: "heading", label: "editor.setting.heading" },
    {
      type: "select",
      id: "depth",
      label: "site-docs:section.toc.depth",
      default: "3",
      options: [
        { value: "2", label: "site-docs:section.toc.depth2" },
        { value: "3", label: "site-docs:section.toc.depth3" },
      ],
    },
    {
      type: "checkbox",
      id: "sticky",
      label: "site-docs:section.nav.sticky",
      default: true,
      info: "site-docs:section.nav.stickyInfo",
    },
    ...layoutSettings(),
  ],
};

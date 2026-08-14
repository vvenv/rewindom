import { SITE_DOCS_ENTITLEMENT } from "../../entitlements.js";
import { DOCS_ARTICLE_PAGE_KIND } from "../../page-kinds.js";

import { layoutSettings } from "../../../../../packages/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "../../../../../packages/builtin/marketing/shared/section-schema.js";

export const SITE_DOCS_NAV_SECTION_TYPE = "site-docs.nav";

/**
 * 文档导航菜单：整个文档库的目录（按分类分组），当前篇高亮。
 *
 * 与 `site-docs.toc` 的分工：这个是**篇与篇之间**的目录，那个是**一篇之内**。
 */
export const siteDocsNavSection: SectionDefinition = {
  type: SITE_DOCS_NAV_SECTION_TYPE,
  label: "site-docs:section.nav.label",
  placements: ["page", "footer"],
  entitlement: SITE_DOCS_ENTITLEMENT.key,
  page_kinds: [DOCS_ARTICLE_PAGE_KIND],
  settings: [
    { type: "text", id: "heading", label: "editor.setting.heading" },
    {
      type: "checkbox",
      id: "show_category",
      label: "site-docs:section.nav.showCategory",
      default: true,
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

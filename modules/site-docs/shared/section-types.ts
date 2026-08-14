import {
  SITE_DOCS_CATEGORY_NAV_SOURCE,
  SITE_DOCS_NAV_SOURCE,
} from "./nav-sources.js";
import { SITE_DOCS_SEARCH_BLOCK_TYPE } from "./search-block.js";
import { SITE_DOCS_ARTICLE_SECTION_TYPE } from "./sections/article/definition.js";
import { SITE_DOCS_LIST_SECTION_TYPE } from "./sections/list/definition.js";
import { SITE_DOCS_NAV_SECTION_TYPE } from "./sections/nav/definition.js";
import { SITE_DOCS_TOC_SECTION_TYPE } from "./sections/toc/definition.js";

export {
  SITE_DOCS_ARTICLE_SECTION_TYPE,
  SITE_DOCS_LIST_SECTION_TYPE,
  SITE_DOCS_NAV_SECTION_TYPE,
  SITE_DOCS_TOC_SECTION_TYPE,
};

/** 段 / chrome / 导航源：SSR 与编辑器预览按这组 type 按需取文档目录。 */
export const SITE_DOCS_CONTEXT_SECTION_TYPES = [
  SITE_DOCS_LIST_SECTION_TYPE,
  SITE_DOCS_ARTICLE_SECTION_TYPE,
  SITE_DOCS_NAV_SECTION_TYPE,
  SITE_DOCS_TOC_SECTION_TYPE,
  SITE_DOCS_SEARCH_BLOCK_TYPE,
  SITE_DOCS_NAV_SOURCE,
  SITE_DOCS_CATEGORY_NAV_SOURCE,
] as const;

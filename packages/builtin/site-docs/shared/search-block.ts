/**
 * 页头文档搜索块：GET 表单跳到本地化的 `/docs?q=`。
 *
 * 取代 marketing 内置的 `chrome_search`。定义在本模块，填进 marketing 的 chrome
 * 注册表；没开通文档库时不出现。
 */

import { SITE_DOCS_ENTITLEMENT } from "./entitlements.js";

import { chromeSlotSettings } from "../../marketing/shared/sections/_common/chrome-blocks.js";

import type { BlockDefinition } from "../../marketing/shared/section-schema.js";

export const SITE_DOCS_SEARCH_BLOCK_TYPE = "site-docs.search";

export const siteDocsSearchBlock: BlockDefinition = {
  type: SITE_DOCS_SEARCH_BLOCK_TYPE,
  label: "site-docs:section.search.label",
  singleton: true,
  entitlement: SITE_DOCS_ENTITLEMENT.key,
  settings: [...chromeSlotSettings({ align: "end", mobile: "hide" })],
};

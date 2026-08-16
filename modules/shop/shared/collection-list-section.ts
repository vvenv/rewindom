/**
 * 分类列表段 —— 树形展示已发布分类，可摆在任意页面（首页、目录、自定义页）。
 *
 * `root_slug` 空或 `__all__` 则从顶层起；选了某个分类则从该分类切一枝。`depth` 是可见层数
 *（含根时根算第 1 层）。店面只出已发布分类。
 */

import { SHOP_ENTITLEMENT } from "./entitlements.js";
import {
  COLLECTION_TREE_MAX_DEPTH,
  COLLECTION_TREE_MIN_DEPTH,
  ROOT_COLLECTION_ALL,
} from "./collection.js";

import {
  headingSettings,
  layoutSettings,
} from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const SHOP_COLLECTION_LIST_SECTION_TYPE = "shop.collection-list";
export const SHOP_COLLECTION_SELECT_OPTIONS = "shop.collections";

export const collectionListSection: SectionDefinition = {
  type: SHOP_COLLECTION_LIST_SECTION_TYPE,
  label: "shop:section.collectionList.label",
  placements: ["page"],
  entitlement: SHOP_ENTITLEMENT.key,
  settings: [
    ...headingSettings(),
    { type: "header", content: "shop:section.collectionList.tree" },
    {
      type: "select",
      id: "root_slug",
      label: "shop:section.collectionList.rootSlug",
      default: ROOT_COLLECTION_ALL,
      options: [
        {
          value: ROOT_COLLECTION_ALL,
          label: "shop:section.collectionList.rootAll",
        },
      ],
      options_from: SHOP_COLLECTION_SELECT_OPTIONS,
      info: "shop:section.collectionList.rootSlugInfo",
    },
    {
      type: "range",
      id: "depth",
      label: "shop:section.collectionList.depth",
      min: COLLECTION_TREE_MIN_DEPTH,
      max: COLLECTION_TREE_MAX_DEPTH,
      step: 1,
      default: 3,
      info: "shop:section.collectionList.depthInfo",
    },
    {
      type: "checkbox",
      id: "include_root",
      label: "shop:section.collectionList.includeRoot",
      default: true,
      info: "shop:section.collectionList.includeRootInfo",
    },
    {
      type: "checkbox",
      id: "show_count",
      label: "shop:section.collectionList.showCount",
      default: false,
      info: "shop:section.collectionList.showCountInfo",
    },
    {
      type: "checkbox",
      id: "show_empty",
      label: "shop:section.collectionList.showEmpty",
      default: true,
      info: "shop:section.collectionList.showEmptyInfo",
    },
    {
      type: "text",
      id: "empty_text",
      label: "shop:section.collectionList.emptyText",
      default: "shop:storefront.collectionList.empty",
    },
    { type: "header", content: "editor.group.layout", group: "layout" },
    ...layoutSettings({ padding_top: 48, padding_bottom: 48 }),
  ],
};

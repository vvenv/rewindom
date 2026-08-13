/**
 * 商品列表段 —— 目录页的必备段，也能摆上首页当「在售商品」。
 *
 * 条目来自已发布商品。`collection_slug` 只出该分类；空则全部在售。
 * `limit` 让首页只露几件，目录模板页把 limit 留 0（全部）。
 */

import { SHOP_ENTITLEMENT } from "./entitlements.js";

import {
  columnsSetting,
  headingSettings,
  layoutSettings,
} from "../../../packages/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "../../../packages/builtin/marketing/shared/section-schema.js";

export const SHOP_PRODUCT_GRID_SECTION_TYPE = "shop.product-grid";

export const productGridSection: SectionDefinition = {
  type: SHOP_PRODUCT_GRID_SECTION_TYPE,
  label: "shop:section.productGrid.label",
  placements: ["page"],
  entitlement: SHOP_ENTITLEMENT.key,
  settings: [
    ...headingSettings(),
    { type: "header", content: "shop:section.productGrid.display" },
    {
      type: "select",
      id: "style",
      label: "shop:section.productGrid.style",
      default: "cards",
      options: [
        { value: "cards", label: "shop:section.productGrid.styleCards" },
        { value: "list", label: "shop:section.productGrid.styleList" },
      ],
    },
    {
      type: "checkbox",
      id: "show_price",
      label: "shop:section.productGrid.showPrice",
      default: true,
    },
    {
      type: "text",
      id: "collection_slug",
      label: "shop:section.productGrid.collectionSlug",
      default: "",
      info: "shop:section.productGrid.collectionSlugInfo",
    },
    {
      type: "range",
      id: "limit",
      label: "shop:section.productGrid.limit",
      min: 0,
      max: 24,
      step: 1,
      default: 0,
      info: "shop:section.productGrid.limitInfo",
    },
    {
      type: "text",
      id: "empty_text",
      label: "shop:section.productGrid.emptyText",
      default: "No products for sale yet.",
    },
    { type: "header", content: "editor.group.layout", group: "layout" },
    columnsSetting(4, 3),
    ...layoutSettings({ padding_top: 48, padding_bottom: 48 }),
  ],
};

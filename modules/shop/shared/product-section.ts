/**
 * 商品详情段 —— `/shop/:slug` 模板页的必备段。
 *
 * 标题 / 价格 / 说明 / 加购是 blocks：租户能调顺序、能删（比如做成只展示不卖），
 * 提交地址与校验仍由代码写死。`buy` 块是真 `<form method="post">`，没有 JS 也能加购。
 */

import { SHOP_ENTITLEMENT } from "./entitlements.js";

import { layoutSettings } from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const SHOP_PRODUCT_SECTION_TYPE = "shop.product";
export const SHOP_PRODUCT_PAGE_KIND = "shop_product";

export const productSection: SectionDefinition = {
  type: SHOP_PRODUCT_SECTION_TYPE,
  label: "shop:section.product.label",
  placements: ["page"],
  page_kinds: [SHOP_PRODUCT_PAGE_KIND],
  entitlement: SHOP_ENTITLEMENT.key,
  settings: [...layoutSettings({ padding_top: 48, padding_bottom: 64 })],
  max_blocks: 8,
  preset_blocks: [
    { type: "media" },
    { type: "title" },
    { type: "price" },
    { type: "description" },
    { type: "buy" },
  ],
  blocks: [
    {
      type: "media",
      label: "shop:block.productMedia",
      singleton: true,
      settings: [],
    },
    {
      type: "title",
      label: "shop:block.productTitle",
      singleton: true,
      settings: [],
    },
    {
      type: "price",
      label: "shop:block.productPrice",
      singleton: true,
      settings: [],
    },
    {
      type: "description",
      label: "shop:block.productDescription",
      singleton: true,
      settings: [],
    },
    {
      type: "buy",
      label: "shop:block.productBuy",
      singleton: true,
      settings: [
        {
          type: "text",
          id: "variant_label",
          label: "shop:block.variantLabel",
          default: "Variant",
          required: true,
        },
        {
          type: "text",
          id: "quantity_label",
          label: "shop:block.quantityLabel",
          default: "Quantity",
          required: true,
        },
        {
          type: "text",
          id: "add_label",
          label: "shop:block.addLabel",
          default: "Add to cart",
          required: true,
        },
        {
          type: "text",
          id: "sold_out_label",
          label: "shop:block.soldOutLabel",
          default: "Sold out",
        },
      ],
    },
  ],
};

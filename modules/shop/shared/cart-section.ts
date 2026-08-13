/**
 * 购物车段 + 页头可用的购物车入口。
 *
 * 购物车页是模板页的必备段：行项目与合计是 blocks，提交仍是真表单。
 * `shop.cart-link` 可以摆进页头区——任意页面上的一枚去购物车的链接；有按请求
 * 的购物车时才带件数，首页那种没有购物车上下文的页面就只出文案。
 */

import { SHOP_ENTITLEMENT } from "./entitlements.js";

import {
  headingSettings,
  layoutSettings,
} from "../../../packages/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "../../../packages/builtin/marketing/shared/section-schema.js";

export const SHOP_CART_SECTION_TYPE = "shop.cart";
export const SHOP_CART_LINK_SECTION_TYPE = "shop.cart-link";
export const SHOP_CART_PAGE_KIND = "shop_cart";

export const cartSection: SectionDefinition = {
  type: SHOP_CART_SECTION_TYPE,
  label: "shop:section.cart.label",
  placements: ["page"],
  page_kinds: [SHOP_CART_PAGE_KIND],
  entitlement: SHOP_ENTITLEMENT.key,
  settings: [
    ...headingSettings(),
    {
      type: "text",
      id: "empty_text",
      label: "shop:section.cart.emptyText",
      default: "Your cart is empty.",
    },
    {
      type: "text",
      id: "continue_label",
      label: "shop:section.cart.continueLabel",
      default: "Continue shopping",
    },
    ...layoutSettings({ padding_top: 48, padding_bottom: 64 }),
  ],
  max_blocks: 4,
  preset_blocks: [{ type: "lines" }, { type: "summary" }],
  blocks: [
    {
      type: "lines",
      label: "shop:block.cartLines",
      singleton: true,
      settings: [
        {
          type: "text",
          id: "item_label",
          label: "shop:block.cartItemLabel",
          default: "Item",
        },
        {
          type: "text",
          id: "qty_label",
          label: "shop:block.cartQtyLabel",
          default: "Qty",
        },
        {
          type: "text",
          id: "total_label",
          label: "shop:block.cartLineTotalLabel",
          default: "Total",
        },
        {
          type: "text",
          id: "update_label",
          label: "shop:block.cartUpdateLabel",
          default: "Update",
        },
      ],
    },
    {
      type: "summary",
      label: "shop:block.cartSummary",
      singleton: true,
      settings: [
        {
          type: "text",
          id: "subtotal_label",
          label: "shop:block.cartSubtotalLabel",
          default: "Subtotal",
        },
        {
          type: "text",
          id: "checkout_label",
          label: "shop:block.cartCheckoutLabel",
          default: "Checkout",
          required: true,
        },
      ],
    },
  ],
};

export const cartLinkSection: SectionDefinition = {
  type: SHOP_CART_LINK_SECTION_TYPE,
  label: "shop:section.cartLink.label",
  placements: ["page", "header", "footer"],
  entitlement: SHOP_ENTITLEMENT.key,
  settings: [
    {
      type: "text",
      id: "label",
      label: "shop:section.cartLink.linkLabel",
      default: "Cart",
      required: true,
    },
    {
      type: "checkbox",
      id: "show_count",
      label: "shop:section.cartLink.showCount",
      default: true,
      info: "shop:section.cartLink.showCountInfo",
    },
    ...layoutSettings({
      padding_top: 8,
      padding_bottom: 8,
      content_width: "default",
    }),
  ],
};

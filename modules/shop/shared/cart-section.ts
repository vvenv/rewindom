/**
 * 购物车页必备段 + 页头 / 页脚的购物车入口块。
 *
 * 购物车页是模板页：行项目与合计是 blocks，提交仍是真表单。
 * `shop.cart-link` 是 chrome 块——加进页头就是一枚按钮，和语言 / 明暗 / 会员同一排，
 * 用块自己的 row / align / mobile 定位。有购物车时才带件数。
 */

import { SHOP_ENTITLEMENT } from "./entitlements.js";

import { chromeSlotSettings } from "../../../packages/builtin/marketing/shared/sections/_common/chrome-blocks.js";
import {
  headingSettings,
  layoutSettings,
} from "../../../packages/builtin/marketing/shared/sections/_common/settings.js";

import type {
  BlockDefinition,
  SectionDefinition,
} from "../../../packages/builtin/marketing/shared/section-schema.js";

export const SHOP_CART_SECTION_TYPE = "shop.cart";
export const SHOP_CART_LINK_BLOCK_TYPE = "shop.cart-link";
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
        {
          type: "text",
          id: "discount_label",
          label: "shop:block.cartDiscountLabel",
          default: "Discount",
        },
        {
          type: "text",
          id: "discount_code_label",
          label: "shop:block.cartDiscountCodeLabel",
          default: "Discount code",
        },
        {
          type: "text",
          id: "discount_apply_label",
          label: "shop:block.cartDiscountApplyLabel",
          default: "Apply",
        },
      ],
    },
  ],
};

export const cartLinkBlock: BlockDefinition = {
  type: SHOP_CART_LINK_BLOCK_TYPE,
  label: "shop:section.cartLink.label",
  singleton: true,
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
    ...chromeSlotSettings({ align: "end", mobile: "pin" }),
  ],
};

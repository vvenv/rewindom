/**
 * 购物车页必备段 + 页头 / 页脚的购物车入口块。
 *
 * 购物车页是模板页：行项目与合计是 blocks，提交仍是真表单。
 * `shop.cart-link` 是 chrome 块——加进页头就是一枚按钮，和语言 / 明暗 / 会员同一排，
 * 用块自己的 row / align / mobile 定位。有购物车时才带件数。
 */

import { SHOP_ENTITLEMENT } from "./entitlements.js";

import { chromeSlotSettings } from "@rewindom/builtin/marketing/shared/sections/_common/chrome-blocks.js";
import {
  headingSettings,
  layoutSettings,
} from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type {
  BlockDefinition,
  SectionDefinition,
} from "@rewindom/builtin/marketing/shared/section-schema.js";

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
    ...headingSettings({ headingDefault: "shop:storefront.cart.title" }),
    {
      type: "text",
      id: "empty_text",
      label: "shop:section.cart.emptyText",
      default: "shop:storefront.cart.empty",
    },
    {
      type: "text",
      id: "continue_label",
      label: "shop:section.cart.continueLabel",
      default: "shop:storefront.cart.continue",
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
          default: "shop:storefront.cart.item",
        },
        {
          type: "text",
          id: "qty_label",
          label: "shop:block.cartQtyLabel",
          default: "shop:storefront.cart.qty",
        },
        {
          type: "text",
          id: "total_label",
          label: "shop:block.cartLineTotalLabel",
          default: "shop:storefront.cart.lineTotal",
        },
        {
          type: "text",
          id: "update_label",
          label: "shop:block.cartUpdateLabel",
          default: "shop:storefront.cart.update",
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
          default: "shop:storefront.cart.subtotal",
        },
        {
          type: "text",
          id: "checkout_label",
          label: "shop:block.cartCheckoutLabel",
          default: "shop:storefront.cart.checkout",
          required: true,
        },
        {
          type: "text",
          id: "discount_label",
          label: "shop:block.cartDiscountLabel",
          default: "shop:storefront.cart.discount",
        },
        {
          type: "text",
          id: "discount_code_label",
          label: "shop:block.cartDiscountCodeLabel",
          default: "shop:storefront.cart.discountCode",
        },
        {
          type: "text",
          id: "discount_apply_label",
          label: "shop:block.cartDiscountApplyLabel",
          default: "shop:storefront.cart.applyDiscount",
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
      default: "shop:storefront.cartLink.label",
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

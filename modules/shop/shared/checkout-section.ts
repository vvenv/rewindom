/**
 * 结账段 —— `/shop/checkout` 模板页的必备段。
 *
 * 真正收卡的是 Stripe Checkout（站外）。这一页收的是下单所需的联系方式、收件地址、
 * 运费档，然后 POST 出去换一条付款链接。字段是 blocks：租户能调顺序、改标签；
 * 整段仍是**一张** `<form method="post">`——地址和「去付款」拆成两张表单，
 * 提交时就会丢一半。
 */

import { SHOP_ENTITLEMENT } from "./entitlements.js";

import {
  headingSettings,
  layoutSettings,
} from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const SHOP_CHECKOUT_SECTION_TYPE = "shop.checkout";
export const SHOP_CHECKOUT_PAGE_KIND = "shop_checkout";

export const checkoutSection: SectionDefinition = {
  type: SHOP_CHECKOUT_SECTION_TYPE,
  label: "shop:section.checkout.label",
  placements: ["page"],
  page_kinds: [SHOP_CHECKOUT_PAGE_KIND],
  entitlement: SHOP_ENTITLEMENT.key,
  settings: [
    ...headingSettings(),
    {
      type: "text",
      id: "canceled_text",
      label: "shop:section.checkout.canceledText",
      default: "shop:storefront.checkout.canceled",
    },
    ...layoutSettings({ padding_top: 48, padding_bottom: 64 }),
  ],
  max_blocks: 8,
  preset_blocks: [
    { type: "contact" },
    { type: "address" },
    { type: "shipping" },
    { type: "note" },
    { type: "pay" },
    { type: "summary" },
  ],
  blocks: [
    {
      type: "contact",
      label: "shop:block.checkoutContact",
      singleton: true,
      settings: [
        {
          type: "text",
          id: "heading",
          label: "shop:block.checkoutContactHeading",
          default: "shop:storefront.checkout.contact",
        },
        {
          type: "text",
          id: "email_label",
          label: "shop:block.emailLabel",
          default: "shop:storefront.checkout.email",
          required: true,
        },
      ],
    },
    {
      type: "address",
      label: "shop:block.checkoutAddress",
      singleton: true,
      settings: [
        {
          type: "text",
          id: "heading",
          label: "shop:block.checkoutAddressHeading",
          default: "shop:storefront.checkout.address",
        },
        {
          type: "text",
          id: "name_label",
          label: "shop:block.nameLabel",
          default: "shop:storefront.checkout.name",
          required: true,
        },
        {
          type: "text",
          id: "line1_label",
          label: "shop:block.line1Label",
          default: "shop:storefront.checkout.line1",
          required: true,
        },
        {
          type: "text",
          id: "city_label",
          label: "shop:block.cityLabel",
          default: "shop:storefront.checkout.city",
          required: true,
        },
        {
          type: "text",
          id: "state_label",
          label: "shop:block.stateLabel",
          default: "shop:storefront.checkout.state",
        },
        {
          type: "text",
          id: "postal_label",
          label: "shop:block.postalLabel",
          default: "shop:storefront.checkout.postal",
          required: true,
        },
        {
          type: "text",
          id: "country_label",
          label: "shop:block.countryLabel",
          default: "shop:storefront.checkout.country",
          required: true,
        },
        {
          type: "text",
          id: "phone_label",
          label: "shop:block.phoneLabel",
          default: "shop:storefront.checkout.phone",
        },
      ],
    },
    {
      type: "shipping",
      label: "shop:block.checkoutShipping",
      singleton: true,
      settings: [
        {
          type: "text",
          id: "heading",
          label: "shop:block.checkoutShippingHeading",
          default: "shop:storefront.checkout.shipping",
        },
        {
          type: "text",
          id: "empty_text",
          label: "shop:block.checkoutShippingEmpty",
          default: "shop:storefront.checkout.shippingEmpty",
        },
      ],
    },
    {
      type: "note",
      label: "shop:block.checkoutNote",
      singleton: true,
      settings: [
        {
          type: "text",
          id: "heading",
          label: "shop:block.checkoutNoteHeading",
          default: "shop:storefront.checkout.noteHeading",
        },
        {
          type: "text",
          id: "note_label",
          label: "shop:block.checkoutNoteLabel",
          default: "shop:storefront.checkout.noteLabel",
        },
      ],
    },
    {
      type: "summary",
      label: "shop:block.checkoutSummary",
      singleton: true,
      settings: [
        {
          type: "text",
          id: "heading",
          label: "shop:block.checkoutSummaryHeading",
          default: "shop:storefront.checkout.summary",
        },
        {
          type: "text",
          id: "subtotal_label",
          label: "shop:block.cartSubtotalLabel",
          default: "shop:storefront.cart.subtotal",
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
        {
          type: "text",
          id: "empty_text",
          label: "shop:block.checkoutSummaryEmpty",
          default: "shop:storefront.cart.empty",
        },
      ],
    },
    {
      type: "pay",
      label: "shop:block.checkoutPay",
      singleton: true,
      settings: [
        {
          type: "text",
          id: "submit_label",
          label: "shop:block.payLabel",
          default: "shop:storefront.checkout.pay",
          required: true,
        },
      ],
    },
  ],
};

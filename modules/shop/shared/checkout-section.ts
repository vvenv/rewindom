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
      default: "Payment canceled. You can try again.",
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
          default: "Contact",
        },
        {
          type: "text",
          id: "email_label",
          label: "shop:block.emailLabel",
          default: "Email",
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
          default: "Shipping address",
        },
        {
          type: "text",
          id: "name_label",
          label: "shop:block.nameLabel",
          default: "Name",
          required: true,
        },
        {
          type: "text",
          id: "line1_label",
          label: "shop:block.line1Label",
          default: "Address",
          required: true,
        },
        {
          type: "text",
          id: "city_label",
          label: "shop:block.cityLabel",
          default: "City",
          required: true,
        },
        {
          type: "text",
          id: "state_label",
          label: "shop:block.stateLabel",
          default: "State",
        },
        {
          type: "text",
          id: "postal_label",
          label: "shop:block.postalLabel",
          default: "Postal code",
          required: true,
        },
        {
          type: "text",
          id: "country_label",
          label: "shop:block.countryLabel",
          default: "Country (ISO-2)",
          required: true,
        },
        {
          type: "text",
          id: "phone_label",
          label: "shop:block.phoneLabel",
          default: "Phone",
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
          default: "Shipping",
        },
        {
          type: "text",
          id: "empty_text",
          label: "shop:block.checkoutShippingEmpty",
          default:
            "No shipping rates for this destination. Add rates in the workspace.",
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
          default: "Order note",
        },
        {
          type: "text",
          id: "note_label",
          label: "shop:block.checkoutNoteLabel",
          default: "Note (optional)",
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
          default: "Order",
        },
        {
          type: "text",
          id: "subtotal_label",
          label: "shop:block.cartSubtotalLabel",
          default: "Subtotal",
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
        {
          type: "text",
          id: "empty_text",
          label: "shop:block.checkoutSummaryEmpty",
          default: "Your cart is empty.",
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
          default: "Pay",
          required: true,
        },
      ],
    },
  ],
};

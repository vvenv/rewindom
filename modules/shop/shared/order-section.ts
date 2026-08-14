/**
 * 订单确认段 + 会员「我的订单」列表段。
 *
 * 付款成功后 Stripe 把人送回 `/shop/orders/:number`；会员在 `/member/orders` 看自己
 * 的历史。两张都是模板页，版式归租户，数据由代码按请求填。
 */

import { SHOP_ENTITLEMENT } from "./entitlements.js";

import {
  headingSettings,
  layoutSettings,
} from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const SHOP_ORDER_SECTION_TYPE = "shop.order";
export const SHOP_ORDER_LIST_SECTION_TYPE = "shop.order-list";
export const SHOP_ORDER_PAGE_KIND = "shop_order";
export const SHOP_MEMBER_ORDERS_PAGE_KIND = "shop_member_orders";

export const orderSection: SectionDefinition = {
  type: SHOP_ORDER_SECTION_TYPE,
  label: "shop:section.order.label",
  placements: ["page"],
  page_kinds: [SHOP_ORDER_PAGE_KIND],
  entitlement: SHOP_ENTITLEMENT.key,
  settings: [
    ...headingSettings(),
    {
      type: "text",
      id: "status_label",
      label: "shop:section.order.statusLabel",
      default: "Status",
    },
    {
      type: "text",
      id: "pending_text",
      label: "shop:section.order.pendingText",
      default: "Confirming payment. Refresh in a moment.",
    },
    {
      type: "text",
      id: "shipping_label",
      label: "shop:section.order.shippingLabel",
      default: "Shipping",
    },
    {
      type: "text",
      id: "tax_label",
      label: "shop:section.order.taxLabel",
      default: "Tax",
    },
    {
      type: "text",
      id: "discount_label",
      label: "shop:section.order.discountLabel",
      default: "Discount",
    },
    {
      type: "text",
      id: "total_label",
      label: "shop:section.order.totalLabel",
      default: "Total",
    },
    {
      type: "text",
      id: "tracking_label",
      label: "shop:section.order.trackingLabel",
      default: "Tracking",
    },
    {
      type: "text",
      id: "note_label",
      label: "shop:section.order.noteLabel",
      default: "Note",
    },
    ...layoutSettings({ padding_top: 48, padding_bottom: 64 }),
  ],
};

export const orderListSection: SectionDefinition = {
  type: SHOP_ORDER_LIST_SECTION_TYPE,
  label: "shop:section.orderList.label",
  placements: ["page"],
  page_kinds: [SHOP_MEMBER_ORDERS_PAGE_KIND],
  entitlement: SHOP_ENTITLEMENT.key,
  settings: [
    ...headingSettings(),
    {
      type: "text",
      id: "empty_text",
      label: "shop:section.orderList.emptyText",
      default: "No orders yet.",
    },
    {
      type: "text",
      id: "number_label",
      label: "shop:section.orderList.numberLabel",
      default: "Order",
    },
    {
      type: "text",
      id: "status_label",
      label: "shop:section.order.statusLabel",
      default: "Status",
    },
    {
      type: "text",
      id: "total_label",
      label: "shop:section.order.totalLabel",
      default: "Total",
    },
    ...layoutSettings({ padding_top: 48, padding_bottom: 64 }),
  ],
};

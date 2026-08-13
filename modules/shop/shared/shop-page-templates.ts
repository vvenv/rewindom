/**
 * 店面那几张页面的**模板页**登记与兜底版式。
 *
 * 与文档库 / 会员页同一套机制（`marketing/shared/page-templates.ts`）：kind 唯一、
 * slug 固定——开通商店时由 marketing 快照落库；记录尚未落库时 SSR 按这里的预设兜底。
 * 自定义之后就是一张普通页面记录，走同一个编辑器、同一套发布流程。
 *
 * 「我的订单」挂在会员页那一组（`MEMBER_PAGE_TEMPLATE_GROUP`）：它是 `/member/*`
 * 家族的一员，不应再开一组碰巧同名的标题。其余店面页自己一组。
 *
 * 元数据在**两端**都要登记（写路径要按 kind 校验 slug，中台要列出这几行），所以由
 * `registerShopPageTemplates()` 统一暴露，server 的 `onBoot` 与 client manifest
 * 各调一次；重复登记是幂等的。
 */

import { SHOP_ENTITLEMENT } from "./entitlements.js";
import {
  SHOP_CART_PAGE_KIND,
  SHOP_CART_SECTION_TYPE,
} from "./cart-section.js";
import {
  SHOP_CHECKOUT_PAGE_KIND,
  SHOP_CHECKOUT_SECTION_TYPE,
} from "./checkout-section.js";
import {
  SHOP_MEMBER_ORDERS_PAGE_KIND,
  SHOP_ORDER_LIST_SECTION_TYPE,
  SHOP_ORDER_PAGE_KIND,
  SHOP_ORDER_SECTION_TYPE,
} from "./order-section.js";
import { SHOP_PRODUCT_GRID_SECTION_TYPE } from "./product-grid-section.js";
import {
  SHOP_PRODUCT_PAGE_KIND,
  SHOP_PRODUCT_SECTION_TYPE,
} from "./product-section.js";
import {
  SHOP_CART_PATH,
  SHOP_CHECKOUT_PATH,
  SHOP_COLLECTION_PATH,
  SHOP_INDEX_PATH,
  SHOP_MEMBER_ORDERS_PATH,
  SHOP_ORDER_PATH,
  SHOP_PRODUCT_PATH,
} from "./shop-section-context.js";

import { MEMBER_PAGE_TEMPLATE_GROUP } from "../../../packages/builtin/site-member/shared/member-page-templates.js";
import {
  registerPageTemplateKind,
  registerPageTemplatePreset,
  type PageTemplateKindDefinition,
} from "../../../packages/builtin/marketing/shared/page-templates.js";

import type { PagePreset } from "../../../packages/builtin/marketing/shared/page-presets.types.js";

export const SHOP_PAGE_TEMPLATE_GROUP = "shop:template.group";

export const SHOP_INDEX_PAGE_KIND = "shop_index";
export const SHOP_INDEX_TEMPLATE_SLUG = "shop";
export const SHOP_PRODUCT_TEMPLATE_SLUG = "shop-product";
export const SHOP_COLLECTION_PAGE_KIND = "shop_collection";
export const SHOP_COLLECTION_TEMPLATE_SLUG = "shop-collection";
export const SHOP_CART_TEMPLATE_SLUG = "shop-cart";
export const SHOP_CHECKOUT_TEMPLATE_SLUG = "shop-checkout";
export const SHOP_ORDER_TEMPLATE_SLUG = "shop-order";
export const SHOP_MEMBER_ORDERS_TEMPLATE_SLUG = "shop-member-orders";

export const SHOP_INDEX_TEMPLATE_PRESET: PagePreset = {
  key: SHOP_INDEX_PAGE_KIND,
  label: "shop:template.catalog.label",
  kind: SHOP_INDEX_PAGE_KIND,
  slug: SHOP_INDEX_TEMPLATE_SLUG,
  titleKey: "shop:storefront.catalog.title",
  descriptionKey: "shop:storefront.catalog.subtitle",
  sections: [
    {
      type: SHOP_PRODUCT_GRID_SECTION_TYPE,
      text: {
        heading: "shop:storefront.catalog.title",
        empty_text: "shop:storefront.catalog.empty",
      },
    },
  ],
};

export const SHOP_COLLECTION_TEMPLATE_PRESET: PagePreset = {
  key: SHOP_COLLECTION_PAGE_KIND,
  label: "shop:template.collection.label",
  kind: SHOP_COLLECTION_PAGE_KIND,
  slug: SHOP_COLLECTION_TEMPLATE_SLUG,
  titleKey: "shop:storefront.collection.title",
  descriptionKey: "shop:storefront.collection.subtitle",
  sections: [
    {
      type: SHOP_PRODUCT_GRID_SECTION_TYPE,
      text: {
        heading: "shop:storefront.collection.title",
        empty_text: "shop:storefront.collection.empty",
      },
    },
  ],
};

export const SHOP_PRODUCT_TEMPLATE_PRESET: PagePreset = {
  key: SHOP_PRODUCT_PAGE_KIND,
  label: "shop:template.product.label",
  kind: SHOP_PRODUCT_PAGE_KIND,
  slug: SHOP_PRODUCT_TEMPLATE_SLUG,
  titleKey: "shop:storefront.product.title",
  descriptionKey: "shop:storefront.product.subtitle",
  sections: [
    {
      type: SHOP_PRODUCT_SECTION_TYPE,
      blocks: [
        { type: "title" },
        { type: "price" },
        { type: "description" },
        {
          type: "buy",
          text: {
            variant_label: "shop:storefront.product.variant",
            quantity_label: "shop:storefront.product.quantity",
            add_label: "shop:storefront.product.add",
            sold_out_label: "shop:storefront.product.soldOut",
          },
        },
      ],
    },
  ],
};

export const SHOP_CART_TEMPLATE_PRESET: PagePreset = {
  key: SHOP_CART_PAGE_KIND,
  label: "shop:template.cart.label",
  kind: SHOP_CART_PAGE_KIND,
  slug: SHOP_CART_TEMPLATE_SLUG,
  titleKey: "shop:storefront.cart.title",
  descriptionKey: "shop:storefront.cart.subtitle",
  sections: [
    {
      type: SHOP_CART_SECTION_TYPE,
      text: {
        heading: "shop:storefront.cart.title",
        empty_text: "shop:storefront.cart.empty",
        continue_label: "shop:storefront.cart.continue",
      },
      blocks: [
        {
          type: "lines",
          text: {
            item_label: "shop:storefront.cart.item",
            qty_label: "shop:storefront.cart.qty",
            total_label: "shop:storefront.cart.lineTotal",
            update_label: "shop:storefront.cart.update",
          },
        },
        {
          type: "summary",
          text: {
            subtotal_label: "shop:storefront.cart.subtotal",
            checkout_label: "shop:storefront.cart.checkout",
            discount_label: "shop:storefront.cart.discount",
            discount_code_label: "shop:storefront.cart.discountCode",
            discount_apply_label: "shop:storefront.cart.applyDiscount",
          },
        },
      ],
    },
  ],
};

export const SHOP_CHECKOUT_TEMPLATE_PRESET: PagePreset = {
  key: SHOP_CHECKOUT_PAGE_KIND,
  label: "shop:template.checkout.label",
  kind: SHOP_CHECKOUT_PAGE_KIND,
  slug: SHOP_CHECKOUT_TEMPLATE_SLUG,
  titleKey: "shop:storefront.checkout.title",
  descriptionKey: "shop:storefront.checkout.subtitle",
  sections: [
    {
      type: SHOP_CHECKOUT_SECTION_TYPE,
      text: {
        heading: "shop:storefront.checkout.title",
        canceled_text: "shop:storefront.checkout.canceled",
      },
      blocks: [
        {
          type: "contact",
          text: {
            heading: "shop:storefront.checkout.contact",
            email_label: "shop:storefront.checkout.email",
          },
        },
        {
          type: "address",
          text: {
            heading: "shop:storefront.checkout.address",
            name_label: "shop:storefront.checkout.name",
            line1_label: "shop:storefront.checkout.line1",
            city_label: "shop:storefront.checkout.city",
            state_label: "shop:storefront.checkout.state",
            postal_label: "shop:storefront.checkout.postal",
            country_label: "shop:storefront.checkout.country",
            phone_label: "shop:storefront.checkout.phone",
          },
        },
        {
          type: "shipping",
          text: {
            heading: "shop:storefront.checkout.shipping",
            empty_text: "shop:storefront.checkout.shippingEmpty",
          },
        },
        {
          type: "pay",
          text: { submit_label: "shop:storefront.checkout.pay" },
        },
        {
          type: "summary",
          text: {
            heading: "shop:storefront.checkout.summary",
            subtotal_label: "shop:storefront.cart.subtotal",
            discount_label: "shop:storefront.cart.discount",
            empty_text: "shop:storefront.cart.empty",
          },
        },
      ],
    },
  ],
};

export const SHOP_ORDER_TEMPLATE_PRESET: PagePreset = {
  key: SHOP_ORDER_PAGE_KIND,
  label: "shop:template.order.label",
  kind: SHOP_ORDER_PAGE_KIND,
  slug: SHOP_ORDER_TEMPLATE_SLUG,
  titleKey: "shop:storefront.order.title",
  descriptionKey: "shop:storefront.order.subtitle",
  sections: [
    {
      type: SHOP_ORDER_SECTION_TYPE,
      text: {
        heading: "shop:storefront.order.title",
        status_label: "shop:storefront.order.status",
        pending_text: "shop:storefront.order.pending",
        shipping_label: "shop:storefront.order.shipping",
        tax_label: "shop:storefront.order.tax",
        discount_label: "shop:storefront.cart.discount",
        total_label: "shop:storefront.order.total",
        tracking_label: "shop:storefront.order.tracking",
      },
    },
  ],
};

export const SHOP_MEMBER_ORDERS_TEMPLATE_PRESET: PagePreset = {
  key: SHOP_MEMBER_ORDERS_PAGE_KIND,
  label: "shop:template.memberOrders.label",
  kind: SHOP_MEMBER_ORDERS_PAGE_KIND,
  slug: SHOP_MEMBER_ORDERS_TEMPLATE_SLUG,
  titleKey: "shop:storefront.orders.title",
  descriptionKey: "shop:storefront.orders.subtitle",
  sections: [
    {
      type: SHOP_ORDER_LIST_SECTION_TYPE,
      text: {
        heading: "shop:storefront.orders.title",
        empty_text: "shop:storefront.orders.empty",
        number_label: "shop:storefront.orders.number",
        status_label: "shop:storefront.order.status",
        total_label: "shop:storefront.order.total",
      },
    },
  ],
};

/**
 * 定义对象提升到模块级：`registerPageTemplateKind` 按引用判等，每次 new 一份
 * 再调会抛 `site.page_kind_conflict`。onBoot / 测试 / 热更新都可能进第二次。
 */
const SHOP_TEMPLATE_KINDS: readonly PageTemplateKindDefinition[] = [
  {
    kind: SHOP_INDEX_PAGE_KIND,
    slug: SHOP_INDEX_TEMPLATE_SLUG,
    path: SHOP_INDEX_PATH,
    group: SHOP_PAGE_TEMPLATE_GROUP,
    label: "shop:template.catalog.label",
    required_section: SHOP_PRODUCT_GRID_SECTION_TYPE,
    entitlement: SHOP_ENTITLEMENT.key,
  },
  {
    kind: SHOP_PRODUCT_PAGE_KIND,
    slug: SHOP_PRODUCT_TEMPLATE_SLUG,
    path: SHOP_PRODUCT_PATH,
    group: SHOP_PAGE_TEMPLATE_GROUP,
    label: "shop:template.product.label",
    required_section: SHOP_PRODUCT_SECTION_TYPE,
    entitlement: SHOP_ENTITLEMENT.key,
  },
  {
    kind: SHOP_COLLECTION_PAGE_KIND,
    slug: SHOP_COLLECTION_TEMPLATE_SLUG,
    path: SHOP_COLLECTION_PATH,
    group: SHOP_PAGE_TEMPLATE_GROUP,
    label: "shop:template.collection.label",
    required_section: SHOP_PRODUCT_GRID_SECTION_TYPE,
    entitlement: SHOP_ENTITLEMENT.key,
  },
  {
    kind: SHOP_CART_PAGE_KIND,
    slug: SHOP_CART_TEMPLATE_SLUG,
    path: SHOP_CART_PATH,
    group: SHOP_PAGE_TEMPLATE_GROUP,
    label: "shop:template.cart.label",
    required_section: SHOP_CART_SECTION_TYPE,
    entitlement: SHOP_ENTITLEMENT.key,
  },
  {
    kind: SHOP_CHECKOUT_PAGE_KIND,
    slug: SHOP_CHECKOUT_TEMPLATE_SLUG,
    path: SHOP_CHECKOUT_PATH,
    group: SHOP_PAGE_TEMPLATE_GROUP,
    label: "shop:template.checkout.label",
    required_section: SHOP_CHECKOUT_SECTION_TYPE,
    entitlement: SHOP_ENTITLEMENT.key,
  },
  {
    kind: SHOP_ORDER_PAGE_KIND,
    slug: SHOP_ORDER_TEMPLATE_SLUG,
    path: SHOP_ORDER_PATH,
    group: SHOP_PAGE_TEMPLATE_GROUP,
    label: "shop:template.order.label",
    required_section: SHOP_ORDER_SECTION_TYPE,
    entitlement: SHOP_ENTITLEMENT.key,
  },
  {
    kind: SHOP_MEMBER_ORDERS_PAGE_KIND,
    slug: SHOP_MEMBER_ORDERS_TEMPLATE_SLUG,
    path: SHOP_MEMBER_ORDERS_PATH,
    group: MEMBER_PAGE_TEMPLATE_GROUP,
    label: "shop:template.memberOrders.label",
    required_section: SHOP_ORDER_LIST_SECTION_TYPE,
    entitlement: SHOP_ENTITLEMENT.key,
  },
];

/** 登记店面模板页（幂等）；server `onBoot` 与 client manifest 各调一次。 */
export function registerShopPageTemplates(): void {
  for (const definition of SHOP_TEMPLATE_KINDS) {
    registerPageTemplateKind(definition);
  }
  registerPageTemplatePreset(SHOP_INDEX_PAGE_KIND, SHOP_INDEX_TEMPLATE_PRESET);
  registerPageTemplatePreset(
    SHOP_PRODUCT_PAGE_KIND,
    SHOP_PRODUCT_TEMPLATE_PRESET,
  );
  registerPageTemplatePreset(
    SHOP_COLLECTION_PAGE_KIND,
    SHOP_COLLECTION_TEMPLATE_PRESET,
  );
  registerPageTemplatePreset(SHOP_CART_PAGE_KIND, SHOP_CART_TEMPLATE_PRESET);
  registerPageTemplatePreset(
    SHOP_CHECKOUT_PAGE_KIND,
    SHOP_CHECKOUT_TEMPLATE_PRESET,
  );
  registerPageTemplatePreset(SHOP_ORDER_PAGE_KIND, SHOP_ORDER_TEMPLATE_PRESET);
  registerPageTemplatePreset(
    SHOP_MEMBER_ORDERS_PAGE_KIND,
    SHOP_MEMBER_ORDERS_TEMPLATE_PRESET,
  );
}


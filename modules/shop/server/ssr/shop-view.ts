/**
 * 把目录 / 购物车 / 订单压成店面段要的视图模型。
 *
 * 渲染器不做数字格式化、不读 Prisma：文案与价格在这里按站点语言定稿。
 */

import { displayTitle, formatMoney } from "../lib/format.js";
import { variantStorefrontLabel } from "../../shared/product-options.js";
import {
  emptyShopContext,
  SHOP_CART_PATH,
  SHOP_CHECKOUT_PATH,
  SHOP_INDEX_PATH,
  type ShopCartView,
  type ShopCheckoutValues,
  type ShopCheckoutView,
  type ShopMemberOrderView,
  type ShopOrderView,
  type ShopProductCardView,
  type ShopProductDetailView,
  type ShopRenderContext,
  type ShopShippingRateView,
} from "../../shared/shop-section-context.js";

import type { ShopCartView as ShopCartData } from "../../shared/cart.js";
import type { ShopProduct } from "../../shared/catalog.js";
import type { ShopOrderDetail, ShopOrderListItem } from "../../shared/order.js";
import type { AppLocale } from "@rewindom/module-sdk";

export function productHref(slug: string): string {
  return `${SHOP_INDEX_PATH}/${encodeURIComponent(slug)}`;
}

export function orderHref(number: string): string {
  return `/shop/orders/${encodeURIComponent(number)}`;
}

export function toProductCard(
  product: ShopProduct,
  locale: AppLocale,
): ShopProductCardView {
  const first = product.variants[0];
  return {
    slug: product.slug,
    href: productHref(product.slug),
    title: displayTitle(product.title, locale, product.slug),
    price: first
      ? formatMoney(first.price_cents, first.currency, locale)
      : "",
  };
}

export function toProductDetail(
  product: ShopProduct,
  locale: AppLocale,
): ShopProductDetailView {
  return {
    title: displayTitle(product.title, locale, product.slug),
    description: displayTitle(product.description, locale),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      label: variantStorefrontLabel(product.options, variant, locale),
      price: formatMoney(variant.price_cents, variant.currency, locale),
      stock: variant.stock_qty,
    })),
  };
}

export function toCartView(cart: ShopCartData, locale: AppLocale): ShopCartView {
  return {
    item_count: cart.item_count,
    subtotal: formatMoney(cart.subtotal_cents, cart.currency, locale),
    items: cart.items.map((item) => ({
      id: item.id,
      title: item.title,
      sku: item.sku,
      quantity: item.quantity,
      line_total: formatMoney(item.line_total_cents, item.currency, locale),
    })),
  };
}

export function emptyCheckoutValues(email = ""): ShopCheckoutValues {
  return {
    email,
    name: "",
    line1: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    phone: "",
    shipping_rate_id: "",
  };
}

export function toCheckoutView(input: {
  email: string;
  rates: ShopShippingRateView[];
  canceled?: boolean;
  values?: Partial<ShopCheckoutValues>;
}): ShopCheckoutView {
  const base = emptyCheckoutValues(input.email);
  return {
    email: input.email,
    rates: input.rates,
    canceled: Boolean(input.canceled),
    values: { ...base, ...input.values, email: input.values?.email ?? input.email },
  };
}

export function toOrderView(
  order: ShopOrderDetail,
  locale: AppLocale,
): ShopOrderView {
  return {
    number: order.number,
    status: order.status,
    pending: order.status === "pending_payment",
    subtotal: formatMoney(order.subtotal_cents, order.currency, locale),
    shipping: formatMoney(order.shipping_cents, order.currency, locale),
    tax: formatMoney(order.tax_cents, order.currency, locale),
    total: formatMoney(order.total_cents, order.currency, locale),
    lines: order.lines.map((line) => ({
      title: line.title,
      quantity: line.quantity,
      line_total: formatMoney(
        line.unit_price_cents * line.quantity,
        order.currency,
        locale,
      ),
    })),
    shipments: order.shipments.map((item) => ({
      carrier_code: item.carrier_code,
      tracking_number: item.tracking_number,
    })),
  };
}

export function toMemberOrderView(
  order: ShopOrderListItem,
  locale: AppLocale,
): ShopMemberOrderView {
  return {
    number: order.number,
    href: orderHref(order.number),
    status: order.status,
    total: formatMoney(order.total_cents, order.currency, locale),
  };
}

export function buildShopContext(
  overrides: Partial<ShopRenderContext> = {},
): ShopRenderContext {
  return emptyShopContext({
    cart_href: SHOP_CART_PATH,
    checkout_href: SHOP_CHECKOUT_PATH,
    shop_href: SHOP_INDEX_PATH,
    action_cart: SHOP_CART_PATH,
    action_checkout: SHOP_CHECKOUT_PATH,
    ...overrides,
  });
}

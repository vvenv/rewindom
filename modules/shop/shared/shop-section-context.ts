/**
 * 店面段的按请求数据（走 `SectionRenderContext.contributed["shop"]`）。
 *
 * 商品列表可以摆在任意页面上，购物车 / 结账 / 详情则钉在各自的模板页——但 key 只有
 * 一个，渲染器各取各的字段。marketing 不认识这些形状，只负责原样透传。
 */

import type { SectionRenderContext } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

export const SHOP_CONTEXT_KEY = "shop";

export const SHOP_INDEX_PATH = "/shop";
export const SHOP_CART_PATH = "/shop/cart";
export const SHOP_CHECKOUT_PATH = "/shop/checkout";
export const SHOP_PRODUCT_PATH = "/shop/:slug";
export const SHOP_COLLECTION_PATH = "/shop/collections/:slug";
export const SHOP_ORDER_PATH = "/shop/orders/:number";
export const SHOP_MEMBER_ORDERS_PATH = "/member/orders";

export interface ShopProductCardView {
  slug: string;
  href: string;
  title: string;
  price: string;
  compare_at_price: string | null;
  image_url: string | null;
  image_alt: string;
  collection_slugs: string[];
}

export interface ShopProductVariantView {
  id: string;
  label: string;
  price: string;
  compare_at_price: string | null;
  stock: number;
  sold_out: boolean;
}

export interface ShopProductImageView {
  url: string;
  alt: string;
}

export interface ShopProductDetailView {
  title: string;
  subtitle: string;
  description: string;
  images: ShopProductImageView[];
  variants: ShopProductVariantView[];
}

export interface ShopCartLineView {
  id: string;
  title: string;
  sku: string;
  image_url: string | null;
  quantity: number;
  line_total: string;
}

export interface ShopCartView {
  items: ShopCartLineView[];
  subtotal: string;
  discount_code: string | null;
  discount: string | null;
  item_count: number;
}

export interface ShopShippingRateView {
  id: string;
  label: string;
  price: string;
}

export interface ShopCheckoutValues {
  email: string;
  name: string;
  line1: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  shipping_rate_id: string;
  note: string;
}

export interface ShopCheckoutView {
  email: string;
  rates: ShopShippingRateView[];
  canceled: boolean;
  requires_shipping: boolean;
  values: ShopCheckoutValues;
}

export interface ShopOrderLineView {
  title: string;
  quantity: number;
  line_total: string;
}

export interface ShopOrderView {
  number: string;
  status: string;
  pending: boolean;
  note: string | null;
  subtotal: string;
  discount_code: string | null;
  discount: string | null;
  shipping: string;
  tax: string;
  total: string;
  lines: ShopOrderLineView[];
  shipments: Array<{ carrier_code: string; tracking_number: string }>;
}

export interface ShopMemberOrderView {
  number: string;
  href: string;
  status: string;
  total: string;
}

export interface ShopRenderContext {
  products: ShopProductCardView[];
  product: ShopProductDetailView | null;
  cart: ShopCartView | null;
  checkout: ShopCheckoutView | null;
  order: ShopOrderView | null;
  orders: ShopMemberOrderView[];
  collection_slug: string | null;
  error: string | null;
  notice: string | null;
  cart_href: string;
  checkout_href: string;
  shop_href: string;
  action_cart: string;
  action_checkout: string;
}

const EMPTY_CONTEXT: ShopRenderContext = {
  products: [],
  product: null,
  cart: null,
  checkout: null,
  order: null,
  orders: [],
  collection_slug: null,
  error: null,
  notice: null,
  cart_href: SHOP_CART_PATH,
  checkout_href: SHOP_CHECKOUT_PATH,
  shop_href: SHOP_INDEX_PATH,
  action_cart: SHOP_CART_PATH,
  action_checkout: SHOP_CHECKOUT_PATH,
};

export function emptyShopContext(
  overrides: Partial<ShopRenderContext> = {},
): ShopRenderContext {
  return { ...EMPTY_CONTEXT, ...overrides };
}

export function readShopContext(
  ctx: SectionRenderContext,
): ShopRenderContext | null {
  const value = ctx.contributed?.[SHOP_CONTEXT_KEY];
  return value ? (value as ShopRenderContext) : null;
}

export function shopContextEntry(
  context: ShopRenderContext,
): Record<string, unknown> {
  return { [SHOP_CONTEXT_KEY]: context };
}

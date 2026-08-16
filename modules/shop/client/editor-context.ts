/**
 * 编辑器预览的店面数据 —— 对应 SSR 的 `registerSectionContextProvider`。
 *
 * 模板页（详情 / 购物车 / 结账 / 订单）没有真实请求上下文，用同一形状的占位
 * 喂给 HTML 渲染器。商品列表有目录时用真实已发布商品，没有则退回占位。
 */

import { api, i18n, normalizeLocale } from "@rewindom/module-sdk/client";

import { registerEditorContextProvider } from "@rewindom/builtin/marketing/client/editor-context-providers.js";

import { SHOP_CART_LINK_BLOCK_TYPE, SHOP_CART_SECTION_TYPE } from "../shared/cart-section.js";
import { SHOP_CHECKOUT_SECTION_TYPE } from "../shared/checkout-section.js";
import { SHOP_COLLECTION_LIST_SECTION_TYPE } from "../shared/collection-list-section.js";
import {
  SHOP_ORDER_LIST_SECTION_TYPE,
  SHOP_ORDER_SECTION_TYPE,
} from "../shared/order-section.js";
import { SHOP_PRODUCT_GRID_SECTION_TYPE } from "../shared/product-grid-section.js";
import { SHOP_PRODUCT_SECTION_TYPE } from "../shared/product-section.js";
import { sampleShopContext } from "../shared/shop-sample.js";
import {
  SHOP_INDEX_PATH,
  shopContextEntry,
  type ShopCollectionCardView,
  type ShopProductCardView,
} from "../shared/shop-section-context.js";

import type { ShopCollectionListItem } from "../shared/collection.js";
import type { ShopProductListItem } from "../shared/catalog.js";

const SHOP_EDITOR_CONTEXT_TYPES = [
  SHOP_PRODUCT_GRID_SECTION_TYPE,
  SHOP_COLLECTION_LIST_SECTION_TYPE,
  SHOP_PRODUCT_SECTION_TYPE,
  SHOP_CART_SECTION_TYPE,
  SHOP_CART_LINK_BLOCK_TYPE,
  SHOP_CHECKOUT_SECTION_TYPE,
  SHOP_ORDER_SECTION_TYPE,
  SHOP_ORDER_LIST_SECTION_TYPE,
] as const;

function toPreviewCard(item: ShopProductListItem): ShopProductCardView {
  const price =
    item.min_price_cents != null ? (item.min_price_cents / 100).toFixed(2) : "";
  return {
    slug: item.slug,
    href: `${SHOP_INDEX_PATH}/${encodeURIComponent(item.slug)}`,
    title: item.title,
    price,
    compare_at_price: null,
    image_url: item.image_url,
    image_alt: item.title,
    collection_slugs: [],
  };
}

function toPreviewCollection(
  item: ShopCollectionListItem,
): ShopCollectionCardView {
  return {
    slug: item.slug,
    parent_slug: item.parent_slug,
    href: `/shop/collections/${encodeURIComponent(item.slug)}`,
    title: item.title,
    product_count: item.product_count,
    sort_order: item.sort_order,
  };
}

export function registerShopEditorContext(): void {
  registerEditorContextProvider({
    sectionTypes: [...SHOP_EDITOR_CONTEXT_TYPES],
    provide: async (input) => {
      /*
       * 标题按**当前选中页面的 locale** 取，而不是后台界面语言：目录接口默认跟着
       * Accept-Language 走，显式带上 `locale` 才能让预览与实站 SSR 取到同一份文案。
       */
      const locale = normalizeLocale(input.locale);
      const sample = sampleShopContext(i18n.getFixedT(locale, "shop"));
      let products = sample.products;
      let collections = sample.collections;
      try {
        const data = await api.get<{ items: ShopProductListItem[] }>(
          "/shop/products",
          { page: 1, page_size: 24, locale },
        );
        const published = data.items.filter((item) => item.status === "published");
        if (published.length > 0) {
          products = published.map(toPreviewCard);
        }
      } catch {
        // 目录拉不到就用占位，预览结构仍与实站同一套渲染器
      }
      try {
        const data = await api.get<{ items: ShopCollectionListItem[] }>(
          "/shop/collections",
          { page: 1, page_size: 100, locale },
        );
        const published = data.items.filter((item) => item.status === "published");
        if (published.length > 0) {
          collections = published.map(toPreviewCollection);
        }
      } catch {
        // 同上
      }
      return shopContextEntry({ ...sample, products, collections });
    },
  });
}

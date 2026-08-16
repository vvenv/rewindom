import "../ssr/shop-preset-i18n.js";

import { isShopEnabled } from "../lib/entitlement.js";
import { listPublishedProducts } from "../catalog/catalog.service.js";
import { listPublishedCollections } from "../catalog/collection.service.js";
import { cartCookieName, peekCart } from "../cart/cart.service.js";
import { toCartView, toCollectionCard, toProductCard } from "../ssr/shop-view.js";
import { cartLinkBlock, cartSection, SHOP_CART_LINK_BLOCK_TYPE } from "../../shared/cart-section.js";
import { checkoutSection } from "../../shared/checkout-section.js";
import { orderListSection, orderSection } from "../../shared/order-section.js";
import {
  collectionListSection,
  SHOP_COLLECTION_LIST_SECTION_TYPE,
} from "../../shared/collection-list-section.js";
import { collectionProductsSection } from "../../shared/collection-products-section.js";
import {
  productGridSection,
  SHOP_PRODUCT_GRID_SECTION_TYPE,
} from "../../shared/product-grid-section.js";
import { productSection } from "../../shared/product-section.js";
import { renderCartHtml, renderCartLinkHtml } from "../../shared/sections/cart-html.js";
import { renderCheckoutHtml } from "../../shared/sections/checkout-html.js";
import { renderCollectionListHtml } from "../../shared/sections/collection-list-html.js";
import { renderCollectionProductsHtml } from "../../shared/sections/collection-products-html.js";
import { renderOrderHtml, renderOrderListHtml } from "../../shared/sections/order-html.js";
import { renderProductHtml } from "../../shared/sections/product-html.js";
import { renderProductGridHtml } from "../../shared/sections/product-grid-html.js";
import {
  shopContextEntry,
  emptyShopContext,
} from "../../shared/shop-section-context.js";
import { SHOP_STOREFRONT_CSS } from "../../shared/site-css.generated.js";

import { registerChromeBlockHtml } from "@rewindom/builtin/marketing/shared/sections/_common/chrome-html.js";
import { registerSiteSectionHtml } from "@rewindom/builtin/marketing/shared/sections/html.js";
import { registerSectionContextProvider } from "@rewindom/builtin/marketing/server/section-context-providers.js";

const css = { css: SHOP_STOREFRONT_CSS };

/**
 * 官网任意页面上的商品列表、分类树与页头购物车入口：通用 SSR 在渲染前按需查。
 *
 * 这些 type 共用一个 provider，避免 `contributed.shop` 被后写的那份整键覆盖。
 * 购物车 / 详情 / 结账仍走本模块自己的 SSR 路由（那些需要 cookie 与路径参数，
 * 而且已经带着完整购物车上下文）。
 */
function registerShopContextProvider(): void {
  registerSectionContextProvider({
    sectionTypes: [
      SHOP_PRODUCT_GRID_SECTION_TYPE,
      SHOP_COLLECTION_LIST_SECTION_TYPE,
      SHOP_CART_LINK_BLOCK_TYPE,
    ],
    provide: async (input) => {
      if (!(await isShopEnabled(input.tenantId))) return {};
      const used = input.usedTypes;
      const wantGrid = !used || used.has(SHOP_PRODUCT_GRID_SECTION_TYPE);
      const wantList = !used || used.has(SHOP_COLLECTION_LIST_SECTION_TYPE);
      const wantCart = !used || used.has(SHOP_CART_LINK_BLOCK_TYPE);
      const products = wantGrid
        ? (await listPublishedProducts(input.tenantId)).map((product) =>
            toProductCard(product, input.locale),
          )
        : [];
      const collections = wantList
        ? (await listPublishedCollections(input.tenantId)).map((row) =>
            toCollectionCard(row, input.locale),
          )
        : [];
      const domainCart =
        wantCart
          ? await peekCart({
              tenant_id: input.tenantId,
              cart_id: input.cookies?.get(cartCookieName()) ?? null,
              member_id: input.memberId ?? null,
              locale: input.locale,
            })
          : null;
      return shopContextEntry(
        emptyShopContext({
          products,
          collections,
          cart: domainCart ? toCartView(domainCart, input.locale) : null,
        }),
      );
    },
  });
}

/** 在模块 `onBoot` 里调。 */
export function registerShopStorefrontSections(): void {
  registerSiteSectionHtml(productGridSection, renderProductGridHtml, css);
  registerSiteSectionHtml(collectionListSection, renderCollectionListHtml, css);
  registerSiteSectionHtml(
    collectionProductsSection,
    renderCollectionProductsHtml,
    css,
  );
  registerSiteSectionHtml(productSection, renderProductHtml, css);
  registerSiteSectionHtml(cartSection, renderCartHtml, css);
  registerChromeBlockHtml(cartLinkBlock, renderCartLinkHtml, css);
  registerSiteSectionHtml(checkoutSection, renderCheckoutHtml, css);
  registerSiteSectionHtml(orderSection, renderOrderHtml, css);
  registerSiteSectionHtml(orderListSection, renderOrderListHtml, css);
  registerShopContextProvider();
}

import { registerCartSections } from "./cart-html.js";
import { registerCheckoutSection } from "./checkout-html.js";
import { registerOrderSections } from "./order-html.js";
import { registerProductSection } from "./product-html.js";
import { registerProductGridSection } from "./product-grid-html.js";
import { isShopEnabled } from "../lib/entitlement.js";
import { listPublishedProducts } from "../catalog/catalog.service.js";
import { cartCookieName, peekCart } from "../cart/cart.service.js";
import { toCartView, toProductCard } from "../ssr/shop-view.js";
import { SHOP_CART_LINK_BLOCK_TYPE } from "../../shared/cart-section.js";
import { SHOP_PRODUCT_GRID_SECTION_TYPE } from "../../shared/product-grid-section.js";
import {
  shopContextEntry,
  emptyShopContext,
} from "../../shared/shop-section-context.js";

import { registerSectionContextProvider } from "../../../../packages/builtin/marketing/server/section-context-providers.js";

/**
 * 官网任意页面上的商品列表与页头购物车入口：通用 SSR 在渲染前按需查。
 *
 * 两个 type 共用一个 provider，避免 `contributed.shop` 被后写的那份整键覆盖。
 * 购物车 / 详情 / 结账仍走本模块自己的 SSR 路由（那些需要 cookie 与路径参数，
 * 而且已经带着完整购物车上下文）。
 */
function registerShopContextProvider(): void {
  registerSectionContextProvider({
    sectionTypes: [SHOP_PRODUCT_GRID_SECTION_TYPE, SHOP_CART_LINK_BLOCK_TYPE],
    provide: async (input) => {
      if (!(await isShopEnabled(input.tenantId))) return {};
      const used = input.usedTypes;
      const wantGrid = !used || used.has(SHOP_PRODUCT_GRID_SECTION_TYPE);
      const wantCart = !used || used.has(SHOP_CART_LINK_BLOCK_TYPE);
      const products = wantGrid
        ? (await listPublishedProducts(input.tenantId)).map((product) =>
            toProductCard(product, input.locale),
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
          cart: domainCart ? toCartView(domainCart, input.locale) : null,
        }),
      );
    },
  });
}

/** 在模块 `onBoot` 里调。 */
export function registerShopStorefrontSections(): void {
  registerProductGridSection();
  registerProductSection();
  registerCartSections();
  registerCheckoutSection();
  registerOrderSections();
  registerShopContextProvider();
}

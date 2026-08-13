import { registerCartSections } from "./cart-html.js";
import { registerCheckoutSection } from "./checkout-html.js";
import { registerOrderSections } from "./order-html.js";
import { registerProductSection } from "./product-html.js";
import { registerProductGridSection } from "./product-grid-html.js";
import { isShopEnabled } from "../lib/entitlement.js";
import { listPublishedProducts } from "../catalog/catalog.service.js";
import { toProductCard } from "../ssr/shop-view.js";
import { SHOP_PRODUCT_GRID_SECTION_TYPE } from "../../shared/product-grid-section.js";
import {
  shopContextEntry,
  emptyShopContext,
} from "../../shared/shop-section-context.js";

import { registerSectionContextProvider } from "../../../../packages/builtin/marketing/server/section-context-providers.js";

/**
 * 官网任意页面上的商品列表：通用 SSR 路由在渲染前按需查已发布商品。
 *
 * 购物车 / 详情 / 结账仍走本模块自己的 SSR 路由（那些需要 cookie 与路径参数）。
 */
function registerProductGridProvider(): void {
  registerSectionContextProvider({
    sectionTypes: [SHOP_PRODUCT_GRID_SECTION_TYPE],
    provide: async ({ tenantId, locale }) => {
      if (!(await isShopEnabled(tenantId))) return {};
      const products = await listPublishedProducts(tenantId);
      return shopContextEntry(
        emptyShopContext({
          products: products.map((product) => toProductCard(product, locale)),
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
  registerProductGridProvider();
}

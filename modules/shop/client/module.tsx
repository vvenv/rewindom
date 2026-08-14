import {
  ClipboardList,
  CreditCard,
  LayoutGrid,
  Package,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";

import { registerChromeBlockView } from "@rewindom/builtin/marketing/client/components/sections/chrome-views.js";
import { registerSiteSectionView } from "@rewindom/builtin/marketing/client/components/sections/section-views.js";

import { SHOP_ENTITLEMENT } from "../shared/index.js";
import { cartLinkBlock, cartSection } from "../shared/cart-section.js";
import { checkoutSection } from "../shared/checkout-section.js";
import { orderListSection, orderSection } from "../shared/order-section.js";
import { productGridSection } from "../shared/product-grid-section.js";
import { productSection } from "../shared/product-section.js";
import { registerShopPageTemplates } from "../shared/shop-page-templates.js";
import { SHOP_STOREFRONT_CSS } from "../shared/site-css.generated.js";

import { CartSection } from "./components/sections/CartSection.js";
import { CartLinkBlock } from "./components/sections/CartLinkBlock.js";
import { CheckoutSection } from "./components/sections/CheckoutSection.js";
import {
  OrderListSection,
  OrderSection,
} from "./components/sections/OrderSection.js";
import { ProductGridSection } from "./components/sections/ProductGridSection.js";
import { ProductSection } from "./components/sections/ProductSection.js";
import { SHOP_I18N } from "./i18n.js";
import { SHOP_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderShopRoutes } from "./tenant/routes.js";
import { SHOP_MOBILE_HEADER_ROUTES } from "./tenant/mobile-header.js";

import type { ClientAppModule } from "@rewindom/module-sdk/client";

registerShopPageTemplates();
registerSiteSectionView(productGridSection, ProductGridSection, {
  css: SHOP_STOREFRONT_CSS,
  icon: LayoutGrid,
});
registerSiteSectionView(productSection, ProductSection, {
  css: SHOP_STOREFRONT_CSS,
  icon: Package,
});
registerSiteSectionView(cartSection, CartSection, {
  css: SHOP_STOREFRONT_CSS,
  icon: ShoppingCart,
});
registerChromeBlockView(cartLinkBlock, CartLinkBlock, {
  css: SHOP_STOREFRONT_CSS,
  icon: ShoppingBag,
});
registerSiteSectionView(checkoutSection, CheckoutSection, {
  css: SHOP_STOREFRONT_CSS,
  icon: CreditCard,
});
registerSiteSectionView(orderSection, OrderSection, {
  css: SHOP_STOREFRONT_CSS,
  icon: ClipboardList,
});
registerSiteSectionView(orderListSection, OrderListSection, {
  css: SHOP_STOREFRONT_CSS,
  icon: ClipboardList,
});

export const shopClientModule: ClientAppModule = {
  id: "shop",
  version: "1.0.0",
  label: "Shop",
  kind: "business",
  description: "商品目录、购物车、结账与履约",
  requires: ["marketing"],
  tenantEntitlements: [SHOP_ENTITLEMENT],
  client: {
    i18n: SHOP_I18N,
    renderRoutes: renderShopRoutes,
    nav: SHOP_NAV_SECTIONS,
    shell: {
      mobileHeaderRoutes: SHOP_MOBILE_HEADER_ROUTES,
    },
  },
};

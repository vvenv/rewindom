import {
  ClipboardList,
  CreditCard,
  FolderTree,
  LayoutGrid,
  Package,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";

import { registerChromeBlockView } from "@rewindom/builtin/marketing/client/components/sections/chrome-views.js";
import { htmlChromeBlockView, htmlSectionView } from "@rewindom/builtin/marketing/client/components/sections/html-section-view.js";
import { registerSiteSectionView } from "@rewindom/builtin/marketing/client/components/sections/section-views.js";

import { SHOP_ENTITLEMENT } from "../shared/index.js";
import { cartLinkBlock, cartSection } from "../shared/cart-section.js";
import { checkoutSection } from "../shared/checkout-section.js";
import { collectionListSection } from "../shared/collection-list-section.js";
import { orderListSection, orderSection } from "../shared/order-section.js";
import { productGridSection } from "../shared/product-grid-section.js";
import { productSection } from "../shared/product-section.js";
import { renderCartHtml, renderCartLinkHtml } from "../shared/sections/cart-html.js";
import { renderCheckoutHtml } from "../shared/sections/checkout-html.js";
import { renderCollectionListHtml } from "../shared/sections/collection-list-html.js";
import { renderOrderHtml, renderOrderListHtml } from "../shared/sections/order-html.js";
import { renderProductHtml } from "../shared/sections/product-html.js";
import { renderProductGridHtml } from "../shared/sections/product-grid-html.js";
import { registerShopPageTemplates } from "../shared/shop-page-templates.js";
import { SHOP_STOREFRONT_CSS } from "../shared/site-css.generated.js";

import { registerShopCollectionSelectOptions } from "./collection-select-options.js";
import { registerShopEditorContext } from "./editor-context.js";
import { SHOP_I18N } from "./i18n.js";
import { SHOP_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderShopRoutes } from "./tenant/routes.js";
import { SHOP_MOBILE_HEADER_ROUTES } from "./tenant/mobile-header.js";

import type { ClientAppModule } from "@rewindom/module-sdk/client";

const css = SHOP_STOREFRONT_CSS;

registerShopPageTemplates();
registerShopEditorContext();
registerShopCollectionSelectOptions();
registerSiteSectionView(productGridSection, htmlSectionView(renderProductGridHtml), {
  css,
  icon: LayoutGrid,
});
registerSiteSectionView(collectionListSection, htmlSectionView(renderCollectionListHtml), {
  css,
  icon: FolderTree,
});
registerSiteSectionView(productSection, htmlSectionView(renderProductHtml), {
  css,
  icon: Package,
});
registerSiteSectionView(cartSection, htmlSectionView(renderCartHtml), {
  css,
  icon: ShoppingCart,
});
registerChromeBlockView(cartLinkBlock, htmlChromeBlockView(renderCartLinkHtml), {
  css,
  icon: ShoppingBag,
});
registerSiteSectionView(checkoutSection, htmlSectionView(renderCheckoutHtml), {
  css,
  icon: CreditCard,
});
registerSiteSectionView(orderSection, htmlSectionView(renderOrderHtml), {
  css,
  icon: ClipboardList,
});
registerSiteSectionView(orderListSection, htmlSectionView(renderOrderListHtml), {
  css,
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

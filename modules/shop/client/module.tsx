import type { ClientAppModule } from "@be-water/module-sdk/client";

import { SHOP_ENTITLEMENT } from "../shared/index.js";

import { SHOP_I18N } from "./i18n.js";
import { SHOP_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderShopRoutes } from "./tenant/routes.js";

export const shopClientModule: ClientAppModule = {
  id: "shop",
  version: "1.0.0",
  label: "Shop",
  kind: "business",
  description: "商品目录、购物车、结账与履约",
  tenantEntitlements: [SHOP_ENTITLEMENT],
  client: {
    i18n: SHOP_I18N,
    renderRoutes: renderShopRoutes,
    nav: SHOP_NAV_SECTIONS,
  },
};

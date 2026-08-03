import { TENANT_MARKETING_ENTITLEMENT } from "../shared/entitlements.js";

import { MARKETING_I18N } from "./i18n.js";
import { renderMarketingPublicRoutes } from "./public/routes.js";
import { SITE_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderSiteRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@be-water/client-kit";

export const marketingClientModule: ClientAppModule = {
  id: "marketing",
  version: "1.0.0",
  label: "官网",
  kind: "infrastructure",
  description:
    "公开官网（平台静态预渲染）+ 租户自助 Marketing CMS（绑定 Host SSR）",
  requires: ["platform"],
  tenantEntitlements: [TENANT_MARKETING_ENTITLEMENT],
  client: {
    i18n: MARKETING_I18N,
    renderPublicRoutes: renderMarketingPublicRoutes,
    renderRoutes: renderSiteRoutes,
    nav: SITE_NAV_SECTIONS,
  },
};

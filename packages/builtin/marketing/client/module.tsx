import { TENANT_MARKETING_ENTITLEMENT } from "../shared/entitlements.js";

import { MARKETING_I18N } from "./i18n.js";
import { MARKETING_DASHBOARD_WIDGETS } from "./tenant/dashboard-widgets.js";
import { SITE_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderSiteRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@rewindom/client-kit";

export const marketingClientModule: ClientAppModule = {
  id: "marketing",
  version: "1.0.0",
  label: "官网",
  kind: "infrastructure",
  description: "租户自助 Marketing CMS（主域绑定默认租户；其它 Host SSR）",
  requires: ["platform"],
  tenantEntitlements: [TENANT_MARKETING_ENTITLEMENT],
  client: {
    i18n: MARKETING_I18N,
    renderRoutes: renderSiteRoutes,
    nav: SITE_NAV_SECTIONS,
    dashboardWidgets: MARKETING_DASHBOARD_WIDGETS,
  },
};

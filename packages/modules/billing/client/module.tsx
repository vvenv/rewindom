import { BILLING_ENTITLEMENT } from "../shared/index.js";

import { BILLING_I18N } from "./i18n.js";
import { billingPlatformNavContributions } from "./platform/nav-contributions.js";
import { renderBillingPlatformRoutes } from "./platform/routes.js";
import { BILLING_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderBillingTenantRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@be-water/client-kit";

export const billingClientModule: ClientAppModule = {
  id: "billing",
  version: "1.0.0",
  label: "Billing",
  kind: "business",
  description: "租户订阅与付款",
  tenantEntitlements: [BILLING_ENTITLEMENT],
  client: {
    i18n: BILLING_I18N,
    renderRoutes: renderBillingTenantRoutes,
    nav: BILLING_NAV_SECTIONS,
    renderPlatformRoutes: renderBillingPlatformRoutes,
    platformNav: billingPlatformNavContributions,
  },
};

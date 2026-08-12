import { CreditCard } from "lucide-react";

import { registerSiteSectionView } from "../../marketing/client/components/sections/section-views.js";
import { BILLING_ENTITLEMENT } from "../shared/index.js";
import { billingPlansSection } from "../shared/plans-section.js";
import { BILLING_PLANS_CSS } from "../shared/site-css.generated.js";

import { BillingPlansSection } from "./components/sections/BillingPlansSection.js";
import { BILLING_I18N } from "./i18n.js";
import { billingPlatformNavContributions } from "./platform/nav-contributions.js";
import { renderBillingPlatformRoutes } from "./platform/routes.js";
import { BILLING_DASHBOARD_WIDGETS } from "./tenant/dashboard-widgets.js";
import { BILLING_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderBillingTenantRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@be-water/client-kit";

/*
 * 「套餐」段：定义在 shared（与服务端 import 同一份），视图填进 marketing 的视图表。
 * 在模块文件顶层注册——manifest 被 import 就等于这个模块装进了这次构建。
 */
registerSiteSectionView(billingPlansSection, BillingPlansSection, {
  css: BILLING_PLANS_CSS,
  icon: CreditCard,
});

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
    dashboardWidgets: BILLING_DASHBOARD_WIDGETS,
    renderPlatformRoutes: renderBillingPlatformRoutes,
    platformNav: billingPlatformNavContributions,
  },
};

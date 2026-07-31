import { getI18n } from "@be-water/client-kit";

import { DASHBOARD_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderDashboardRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@be-water/client-kit";

/**
 * 纯前端模块：没有 server 面，也**不声明** `tenantEntitlements`——
 * 工作台是登录落地页，可被平台关掉就等于租户登录后无处可去。
 */
export const dashboardClientModule: ClientAppModule = {
  id: "dashboard",
  version: "1.0.0",
  label: "Dashboard",
  kind: "infrastructure",
  description: getI18n().t("description", { ns: "dashboard" }),
  client: {
    renderRoutes: renderDashboardRoutes,
    nav: DASHBOARD_NAV_SECTIONS,
    mobileTabPaths: ["/dashboard"],
  },
};

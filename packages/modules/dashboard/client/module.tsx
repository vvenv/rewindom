import { DASHBOARD_I18N } from "./i18n.js";
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
  description: "租户登录后的默认首页，聚合各模块通过 dashboardWidgets 贡献的卡片",
  client: {
    i18n: DASHBOARD_I18N,
    renderRoutes: renderDashboardRoutes,
    nav: DASHBOARD_NAV_SECTIONS,
    mobileTabPaths: ["/dashboard"],
  },
};

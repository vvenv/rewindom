import { lazy, type ReactNode } from "react";

import { Route } from "react-router";

const Dashboard = lazy(() =>
  import("../pages/dashboard.js").then((module) => ({
    default: module.Dashboard,
  })),
);

/**
 * 不套 `TenantModuleRoute` / `PermissionRoute`：工作台是所有租户用户的登录落地页，
 * 一旦可被关闭或需要权限，`HOME_PATH_CANDIDATES` 的兜底就会失效（登录后无处可去）。
 * 权限收窄发生在**卡片**粒度（`DashboardWidget.anyPermission`）。
 */
export function renderDashboardRoutes(): ReactNode {
  return <Route path="/app/dashboard" element={<Dashboard />} />;
}

import { lazy, type ReactNode } from "react";

import { PermissionRoute } from "@be-water/client-kit";
import { Route } from "react-router";

const TenantErrorLogs = lazy(() =>
  import("../pages/tenant-error-logs.js").then((module) => ({
    default: module.TenantErrorLogs,
  })),
);

export function renderErrorLogTenantRoutes(): ReactNode {
  return (
    <Route element={<PermissionRoute permission="error_logs.read" />}>
      <Route path="/app/error-logs" element={<TenantErrorLogs />} />
    </Route>
  );
}

import { lazy, type ReactNode } from "react";

import { PermissionRoute } from "@be-water/client-kit";
import { Route } from "react-router";

const TenantAuditLogs = lazy(() =>
  import("../pages/tenant-audit-logs.js").then((module) => ({
    default: module.TenantAuditLogs,
  })),
);

export function renderAuditTenantRoutes(): ReactNode {
  return (
    <Route element={<PermissionRoute permission="audit_logs.read" />}>
      <Route path="/app/audit-logs" element={<TenantAuditLogs />} />
    </Route>
  );
}

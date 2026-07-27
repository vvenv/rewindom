import { lazy, type ReactNode } from "react";

import { Route } from "react-router";

const PlatformAuditLogs = lazy(() =>
  import("./pages/audit-logs.js").then((module) => ({
    default: module.AuditLogs,
  })),
);

export function renderAuditPlatformRoutes(): ReactNode {
  return <Route path="/platform/audit-logs" element={<PlatformAuditLogs />} />;
}

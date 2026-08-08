import { lazy, type ReactNode } from "react";

import { Route } from "react-router";

const PlatformSlowQueryLogs = lazy(() =>
  import("./pages/slow-query-logs.js").then((module) => ({
    default: module.SlowQueryLogs,
  })),
);

export function renderSlowQueryPlatformRoutes(): ReactNode {
  return (
    <Route path="/platform/slow-query-logs" element={<PlatformSlowQueryLogs />} />
  );
}

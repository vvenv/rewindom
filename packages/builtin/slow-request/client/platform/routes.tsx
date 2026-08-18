import { lazy, type ReactNode } from "react";

import { Route } from "react-router";

const PlatformSlowRequestLogs = lazy(() =>
  import("../pages/slow-request-logs.js").then((module) => ({
    default: module.SlowRequestLogs,
  })),
);

export function renderSlowRequestPlatformRoutes(): ReactNode {
  return (
    <Route
      path="/platform/slow-request-logs"
      element={<PlatformSlowRequestLogs />}
    />
  );
}

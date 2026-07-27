import { lazy, type ReactNode } from "react";

import { Route } from "react-router";

const PlatformErrorLogs = lazy(() =>
  import("./pages/error-logs.js").then((module) => ({
    default: module.ErrorLogs,
  })),
);

export function renderErrorLogPlatformRoutes(): ReactNode {
  return <Route path="/platform/error-logs" element={<PlatformErrorLogs />} />;
}

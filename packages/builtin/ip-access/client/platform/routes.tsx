import { lazy, type ReactNode } from "react";

import { Route } from "react-router";

const PlatformIpRules = lazy(() =>
  import("../pages/platform-ip-rules.js").then((module) => ({
    default: module.PlatformIpRules,
  })),
);

export function renderIpAccessPlatformRoutes(): ReactNode {
  return <Route path="/platform/ip-rules" element={<PlatformIpRules />} />;
}

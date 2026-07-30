import { lazy, type ReactNode } from "react";

import { Route } from "react-router";

const PlatformBillingPage = lazy(() =>
  import("../pages/platform-billing.js").then((module) => ({
    default: module.PlatformBillingPage,
  })),
);

export function renderBillingPlatformRoutes(): ReactNode {
  return (
    <Route path="/platform/billing" element={<PlatformBillingPage />} />
  );
}

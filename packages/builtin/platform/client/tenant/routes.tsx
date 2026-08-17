import { lazy, type ReactNode } from "react";

import { PermissionRoute } from "@rewindom/client-kit";
import { Route } from "react-router";

const TenantSettings = lazy(() =>
  import("../pages/tenant-settings.js").then((module) => ({
    default: module.TenantSettingsPage,
  })),
);

export function renderPlatformTenantRoutes(): ReactNode {
  return (
    <Route element={<PermissionRoute permission="settings.read" />}>
      <Route path="/app/settings" element={<TenantSettings />} />
    </Route>
  );
}

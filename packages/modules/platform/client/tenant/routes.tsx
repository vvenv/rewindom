import { lazy, type ReactNode } from "react";

import { PermissionRoute } from "@be-water/client-kit";
import { Route } from "react-router";

const SettingsBrandingPage = lazy(() =>
  import("../pages/settings-branding.js").then((module) => ({
    default: module.SettingsBrandingPage,
  })),
);

export function renderPlatformTenantRoutes(): ReactNode {
  return (
    <Route element={<PermissionRoute permission="settings.read" />}>
      <Route path="/settings" element={<SettingsBrandingPage />} />
    </Route>
  );
}

import { lazy, type ReactNode } from "react";

import { PermissionRoute } from "@be-water/client-kit";
import { Route } from "react-router";

const SettingsBrandingPage = lazy(() =>
  import("../pages/settings-branding.js").then((module) => ({
    default: module.SettingsBrandingPage,
  })),
);

const SettingsOAuthPage = lazy(() =>
  import("../pages/settings-oauth.js").then((module) => ({
    default: module.SettingsOAuthPage,
  })),
);

export function renderPlatformTenantRoutes(): ReactNode {
  return (
    <Route element={<PermissionRoute permission="settings.read" />}>
      <Route path="/app/settings" element={<SettingsBrandingPage />} />
      <Route path="/app/settings/oauth" element={<SettingsOAuthPage />} />
    </Route>
  );
}

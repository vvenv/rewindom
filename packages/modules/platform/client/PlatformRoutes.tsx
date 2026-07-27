import { lazy, type ReactNode } from "react";

import { PermissionRoute } from "@be-water/client-kit";
import { Route } from "react-router";

const PlatformDashboard = lazy(() =>
  import("./pages/dashboard.js").then((module) => ({
    default: module.Dashboard,
  })),
);
const PlatformTenants = lazy(() =>
  import("./pages/tenants.js").then((module) => ({
    default: module.Tenants,
  })),
);
const PlatformUsers = lazy(() =>
  import("./pages/users.js").then((module) => ({
    default: module.Users,
  })),
);
const PlatformAdmins = lazy(() =>
  import("./pages/platform-admins.js").then((module) => ({
    default: module.PlatformAdmins,
  })),
);
const PlatformSettings = lazy(() =>
  import("./pages/platform-settings.js").then(
    (module) => ({
      default: module.PlatformSettings,
    }),
  ),
);

export function renderPlatformRoutes(): ReactNode {
  return (
    <>
      <Route path="/platform" element={<PlatformDashboard />} />
      <Route path="/platform/tenants" element={<PlatformTenants />} />
      <Route path="/platform/users" element={<PlatformUsers />} />
      <Route
        element={<PermissionRoute permission="platform.admins.read" />}
      >
        <Route path="/platform/admins" element={<PlatformAdmins />} />
      </Route>
      <Route path="/platform/settings" element={<PlatformSettings />} />
    </>
  );
}

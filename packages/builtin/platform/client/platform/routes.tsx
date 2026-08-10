import { lazy, type ReactNode } from "react";

import { PermissionRoute, usePublicConfig } from "@be-water/client-kit";
import { Navigate, Route } from "react-router";

const PlatformDashboard = lazy(() =>
  import("../pages/dashboard.js").then((module) => ({
    default: module.Dashboard,
  })),
);
const PlatformTenants = lazy(() =>
  import("../pages/tenants.js").then((module) => ({
    default: module.Tenants,
  })),
);
const PlatformUsers = lazy(() =>
  import("../pages/users.js").then((module) => ({
    default: module.Users,
  })),
);
const PlatformAdmins = lazy(() =>
  import("../pages/platform-admins.js").then((module) => ({
    default: module.PlatformAdmins,
  })),
);
const PlatformSettings = lazy(() =>
  import("../pages/platform-settings.js").then(
    (module) => ({
      default: module.PlatformSettings,
    }),
  ),
);

function PlatformTenantsRoute(): ReactNode {
  const {
    data: { single_tenant },
  } = usePublicConfig();
  if (single_tenant) {
    return <Navigate to="/platform" replace />;
  }
  return <PlatformTenants />;
}

export function renderPlatformRoutes(): ReactNode {
  return (
    <>
      <Route path="/platform" element={<PlatformDashboard />} />
      <Route path="/platform/tenants" element={<PlatformTenantsRoute />} />
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

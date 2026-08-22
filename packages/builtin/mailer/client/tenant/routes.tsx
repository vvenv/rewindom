import { lazy, type ReactNode } from "react";

import { PermissionRoute, TenantModuleRoute } from "@rewindom/client-kit";
import { Route } from "react-router";

const Mailer = lazy(() =>
  import("../pages/mailer.js").then((module) => ({
    default: module.Mailer,
  })),
);

export function renderMailerRoutes(): ReactNode {
  return (
    <Route element={<TenantModuleRoute moduleId="mailer" />}>
      <Route element={<PermissionRoute permission="mailer.read" />}>
        <Route path="/app/mailer" element={<Mailer />} />
      </Route>
    </Route>
  );
}

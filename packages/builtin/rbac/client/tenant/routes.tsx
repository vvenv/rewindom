import { lazy, type ReactNode } from "react";

import { PermissionRoute } from "@be-water/client-kit";
import { Route } from "react-router";

const Roles = lazy(() =>
  import("../pages/roles.js").then((module) => ({
    default: module.Roles,
  })),
);

export function renderRbacSuperUserRoutes(): ReactNode {
  return (
    <Route element={<PermissionRoute permission="roles.read" />}>
      <Route path="/app/roles" element={<Roles />} />
    </Route>
  );
}

import { lazy, type ReactNode } from "react";

import { PermissionRoute } from "@be-water/client-kit";
import { Route } from "react-router";

const Users = lazy(() =>
  import("./pages/users.js").then((module) => ({
    default: module.Users,
  })),
);

export function renderUserSuperUserRoutes(): ReactNode {
  return (
    <Route element={<PermissionRoute permission="users.read" />}>
      <Route path="/app/users" element={<Users />} />
    </Route>
  );
}

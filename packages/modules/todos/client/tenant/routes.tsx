import { lazy, type ReactNode } from "react";

import { PermissionRoute, TenantModuleRoute } from "@be-water/client-kit";
import { Route } from "react-router";

const Todos = lazy(() =>
  import("../pages/todos.js").then((module) => ({
    default: module.Todos,
  })),
);

export function renderTodosRoutes(): ReactNode {
  return (
    <Route element={<TenantModuleRoute moduleId="todos" label="待办" />}>
      <Route element={<PermissionRoute permission="todos.read" />}>
        <Route path="/todos" element={<Todos />} />
      </Route>
    </Route>
  );
}

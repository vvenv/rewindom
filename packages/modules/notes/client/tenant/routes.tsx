import { lazy, type ReactNode } from "react";

import { PermissionRoute, TenantModuleRoute } from "@be-water/client-kit";
import { Route } from "react-router";

const Notes = lazy(() =>
  import("../pages/notes.js").then((module) => ({
    default: module.Notes,
  })),
);

export function renderNotesRoutes(): ReactNode {
  return (
    <Route element={<TenantModuleRoute moduleId="notes" label="笔记" />}>
      <Route element={<PermissionRoute permission="notes.read" />}>
        <Route path="/notes" element={<Notes />} />
      </Route>
    </Route>
  );
}

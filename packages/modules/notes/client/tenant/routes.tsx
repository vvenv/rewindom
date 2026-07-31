import { lazy, type ReactNode } from "react";

import { PermissionRoute, TenantModuleRoute } from "@be-water/client-kit";
import { Route } from "react-router";
import { useTranslation } from "react-i18next";

const Notes = lazy(() =>
  import("../pages/notes.js").then((module) => ({
    default: module.Notes,
  })),
);

function NotesModuleRoute() {
  const { t } = useTranslation("notes");
  return <TenantModuleRoute moduleId="notes" label={t("title")} />;
}

export function renderNotesRoutes(): ReactNode {
  return (
    <Route element={<NotesModuleRoute />}>
      <Route element={<PermissionRoute permission="notes.read" />}>
        <Route path="/notes" element={<Notes />} />
      </Route>
    </Route>
  );
}

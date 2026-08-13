import { lazy, type ReactNode } from "react";

import {
  PermissionRoute,
  TenantModuleRoute,
} from "@rewindom/module-sdk/client";
import { useTranslation } from "react-i18next";
import { Route } from "react-router";

const Notes = lazy(() =>
  import("../pages/notes.js").then((module) => ({
    default: module.Notes,
  })),
);

function NoteModuleRoute() {
  const { t } = useTranslation("note");
  return <TenantModuleRoute moduleId="note" label={t("title")} />;
}

export function renderNoteRoutes(): ReactNode {
  return (
    <Route element={<NoteModuleRoute />}>
      <Route element={<PermissionRoute permission="note.read" />}>
        <Route path="/app/notes" element={<Notes />} />
      </Route>
    </Route>
  );
}

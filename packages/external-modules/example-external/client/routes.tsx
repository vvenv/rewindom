import { lazy, type ReactNode } from "react";

import {
  PermissionRoute,
  TenantModuleRoute,
} from "@be-water/module-sdk/client";
import { useTranslation } from "react-i18next";
import { Route } from "react-router";

const Bookmarks = lazy(() =>
  import("./pages/bookmarks.js").then((module) => ({
    default: module.Bookmarks,
  })),
);

function ExampleExternalModuleRoute() {
  const { t } = useTranslation("example-external");
  return <TenantModuleRoute moduleId="example-external" label={t("title")} />;
}

export function renderExampleExternalRoutes(): ReactNode {
  return (
    <Route element={<ExampleExternalModuleRoute />}>
      <Route element={<PermissionRoute permission="example-external.read" />}>
        <Route path="/app/example-external" element={<Bookmarks />} />
      </Route>
    </Route>
  );
}

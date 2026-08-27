import { lazy, type ReactNode } from "react";

import {
  PermissionRoute,
  TenantModuleRoute,
} from "@rewindom/module-sdk/client";
import { useTranslation } from "react-i18next";
import { Route } from "react-router";

const Things = lazy(() =>
  import("../pages/things.js").then((module) => ({
    default: module.Things,
  })),
);

function UselessModuleRoute() {
  const { t } = useTranslation("useless");
  return <TenantModuleRoute moduleId="useless" label={t("title")} />;
}

export function renderThingsRoutes(): ReactNode {
  return (
    <Route element={<UselessModuleRoute />}>
      <Route element={<PermissionRoute permission="things.read" />}>
        <Route path="/app/things" element={<Things />} />
      </Route>
    </Route>
  );
}

import { lazy, type ReactNode } from "react";

import { PermissionRoute, TenantModuleRoute } from "@rewindom/module-sdk/client";
import { useTranslation } from "react-i18next";
import { Route } from "react-router";

const SiteDocs = lazy(() =>
  import("../pages/docs.js").then((module) => ({
    default: module.SiteDocs,
  })),
);

function DocsModuleRoute() {
  const { t } = useTranslation("site-docs");
  return <TenantModuleRoute moduleId="site-docs" label={t("siteDocs.nav")} />;
}

export function renderSiteDocsRoutes(): ReactNode {
  return (
    <Route element={<DocsModuleRoute />}>
      <Route element={<PermissionRoute permission="docs.read" />}>
        <Route path="/app/docs" element={<SiteDocs />} />
      </Route>
    </Route>
  );
}

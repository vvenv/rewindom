import { lazy, type ReactNode } from "react";

import {
  PermissionRoute,
  TenantModuleRoute,
} from "@rewindom/module-sdk/client";
import { useTranslation } from "react-i18next";
import { Route } from "react-router";

const FormSubmissions = lazy(() =>
  import("../pages/form-submissions.js").then((module) => ({
    default: module.FormSubmissions,
  })),
);

function SiteFormModuleRoute() {
  const { t } = useTranslation("site-form");
  return <TenantModuleRoute moduleId="site-form" label={t("formSubmissions.nav")} />;
}

export function renderSiteFormRoutes(): ReactNode {
  return (
    <Route element={<SiteFormModuleRoute />}>
      <Route element={<PermissionRoute permission="form.read" />}>
        <Route path="/app/site-form" element={<FormSubmissions />} />
      </Route>
    </Route>
  );
}

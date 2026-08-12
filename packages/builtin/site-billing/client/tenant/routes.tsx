import { lazy, type ReactNode } from "react";

import { PermissionRoute, TenantModuleRoute } from "@be-water/client-kit";
import { useTranslation } from "react-i18next";
import { Route } from "react-router";

const SiteBilling = lazy(() =>
  import("../pages/site-billing.js").then((module) => ({
    default: module.SiteBillingPage,
  })),
);

function SiteBillingModuleRoute() {
  const { t } = useTranslation("site-billing");
  return (
    <TenantModuleRoute moduleId="tenant-site-billing" label={t("page.title")} />
  );
}

export function renderSiteBillingRoutes(): ReactNode {
  return (
    <Route element={<SiteBillingModuleRoute />}>
      <Route element={<PermissionRoute permission="site_billing.read" />}>
        <Route path="/app/site-billing" element={<SiteBilling />} />
      </Route>
    </Route>
  );
}

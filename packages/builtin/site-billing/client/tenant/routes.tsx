import { lazy, type ReactNode } from "react";

import {
  PermissionRoute,
  TenantModuleRoute,
} from "@rewindom/client-kit";
import { useTranslation } from "react-i18next";
import { Route } from "react-router";

const MemberPlans = lazy(() =>
  import("../pages/member-plans.js").then((module) => ({
    default: module.MemberPlansPage,
  })),
);

const MemberRecords = lazy(() =>
  import("../pages/member-records.js").then((module) => ({
    default: module.MemberRecordsPage,
  })),
);

function SiteBillingModuleRoute() {
  const { t } = useTranslation("site-billing");
  return (
    <TenantModuleRoute
      moduleId="site-billing"
      label={t("page.records.title")}
    />
  );
}

export function renderSiteBillingRoutes(): ReactNode {
  return (
    <Route element={<SiteBillingModuleRoute />}>
      <Route element={<PermissionRoute permission="site_billing.read" />}>
        <Route path="/app/site-billing" element={<MemberPlans />} />
        <Route path="/app/site-billing/records" element={<MemberRecords />} />
      </Route>
    </Route>
  );
}

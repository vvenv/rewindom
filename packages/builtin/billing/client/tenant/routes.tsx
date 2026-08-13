import { lazy, type ReactNode } from "react";

import {
  PermissionRoute,
  TenantModuleRoute,
} from "@rewindom/client-kit";
import { Route } from "react-router";


const BillingPage = lazy(() =>
  import("../pages/billing.js").then((module) => ({
    default: module.BillingPage,
  })),
);

export function renderBillingTenantRoutes(): ReactNode {
  return (
    <Route element={<TenantModuleRoute moduleId="billing" label="订阅与付款" />}>
      <Route element={<PermissionRoute permission="billing.read" />}>
        <Route path="/app/billing" element={<BillingPage />} />
      </Route>
    </Route>
  );
}

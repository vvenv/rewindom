import { lazy, type ReactNode } from "react";

import { PermissionRoute } from "@rewindom/client-kit";
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

/**
 * 不套 `TenantModuleRoute`：会员付费是每个站点都具备的能力，没有开关可关。
 * 剩下的只有权限——能不能看这一页仍归角色管。
 */
export function renderSiteBillingRoutes(): ReactNode {
  return (
    <Route element={<PermissionRoute permission="site_billing.read" />}>
      <Route path="/app/site-billing" element={<MemberPlans />} />
      <Route path="/app/site-billing/records" element={<MemberRecords />} />
    </Route>
  );
}

import { lazy, type ReactNode } from "react";

import { PermissionRoute } from "@be-water/client-kit";
import { Route } from "react-router";

const SiteMembers = lazy(() =>
  import("../pages/site-members.js").then((module) => ({
    default: module.SiteMembers,
  })),
);

/**
 * 不套 `TenantModuleRoute`：会员体系是每个站点都具备的能力，没有开关可关。
 * 剩下的只有权限——能不能管这批会员仍归角色管。
 */
export function renderSiteMemberRoutes(): ReactNode {
  return (
    <Route element={<PermissionRoute permission="site_members.read" />}>
      <Route path="/app/site-members" element={<SiteMembers />} />
    </Route>
  );
}

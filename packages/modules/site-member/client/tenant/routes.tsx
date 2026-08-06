import { lazy, type ReactNode } from "react";

import { PermissionRoute, TenantModuleRoute } from "@be-water/client-kit";
import { useTranslation } from "react-i18next";
import { Route } from "react-router";

const SiteMembers = lazy(() =>
  import("../pages/site-members.js").then((module) => ({
    default: module.SiteMembers,
  })),
);

function SiteMemberModuleRoute() {
  const { t } = useTranslation("site-member");
  return (
    <TenantModuleRoute
      moduleId="tenant-site-member"
      label={t("admin.title")}
    />
  );
}

export function renderSiteMemberRoutes(): ReactNode {
  return (
    <Route element={<SiteMemberModuleRoute />}>
      <Route element={<PermissionRoute permission="site_members.read" />}>
        <Route path="/site-members" element={<SiteMembers />} />
      </Route>
    </Route>
  );
}

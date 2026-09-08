import { lazy, type ReactNode } from "react";

import { PermissionRoute, TenantModuleRoute } from "@rewindom/client-kit";
import { useTranslation } from "react-i18next";
import { Route } from "react-router";

const IpAccess = lazy(() =>
  import("../pages/ip-access.js").then((module) => ({
    default: module.IpAccess,
  })),
);

function IpAccessModuleRoute() {
  const { t } = useTranslation("ip-access");
  return <TenantModuleRoute moduleId="ip-access" label={t("title")} />;
}

export function renderIpAccessRoutes(): ReactNode {
  return (
    <Route element={<IpAccessModuleRoute />}>
      <Route element={<PermissionRoute permission="ip_access.read" />}>
        <Route path="/app/ip-access" element={<IpAccess />} />
      </Route>
    </Route>
  );
}

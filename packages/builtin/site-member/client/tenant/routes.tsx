import { lazy, type ReactNode } from "react";

import { PermissionRoute, TenantModuleRoute } from "@rewindom/client-kit";
import { useTranslation } from "react-i18next";
import { Route } from "react-router";

import { SITE_MEMBER_ENTITLEMENT } from "../../shared/entitlements.js";

const SiteMembers = lazy(() =>
  import("../pages/site-members.js").then((module) => ({
    default: module.SiteMembers,
  })),
);

function SiteMemberModuleRoute() {
  const { t } = useTranslation("site-member");
  return (
    <TenantModuleRoute
      moduleId={SITE_MEMBER_ENTITLEMENT.key}
      label={t("admin.nav")}
      disabledHint={t("admin.disabledHint")}
    />
  );
}

/**
 * 开关 + 权限两道：站点关掉会员功能就整块消失（与服务端的
 * `registerTenantGatedRoutes` 同一个 key），开着时能不能管仍归角色。
 */
export function renderSiteMemberRoutes(): ReactNode {
  return (
    <Route element={<SiteMemberModuleRoute />}>
      <Route element={<PermissionRoute permission="site_members.read" />}>
        <Route path="/app/site-members" element={<SiteMembers />} />
      </Route>
    </Route>
  );
}

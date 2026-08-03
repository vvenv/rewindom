import { lazy, type ReactNode } from "react";

import { PermissionRoute, TenantModuleRoute } from "@be-water/client-kit";
import { useTranslation } from "react-i18next";
import { Route } from "react-router";

const SiteCms = lazy(() =>
  import("../pages/site-cms.js").then((module) => ({
    default: module.SiteCms,
  })),
);

const SiteThemeEditor = lazy(() =>
  import("../pages/site-theme-editor.js").then((module) => ({
    default: module.SiteThemeEditor,
  })),
);

function SiteModuleRoute() {
  const { t } = useTranslation("marketing");
  return (
    <TenantModuleRoute
      moduleId="tenant-marketing"
      label={t("cms.title")}
      disabledHint={t("cms.disabledHint")}
    />
  );
}

export function renderSiteRoutes(): ReactNode {
  return (
    <Route element={<SiteModuleRoute />}>
      <Route element={<PermissionRoute permission="site.read" />}>
        <Route path="/site" element={<SiteCms />} />
        <Route path="/site/pages/:pageId" element={<SiteThemeEditor />} />
      </Route>
    </Route>
  );
}

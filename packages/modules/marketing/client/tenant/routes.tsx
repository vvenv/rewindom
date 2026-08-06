import { lazy, type ReactNode } from "react";

import { PermissionRoute, TenantModuleRoute } from "@be-water/client-kit";
import { useTranslation } from "react-i18next";
import { Route } from "react-router";

const Site = lazy(() =>
  import("../pages/site.js").then((module) => ({
    default: module.Site,
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
        <Route path="/site" element={<Site />} />
        <Route path="/site/pages/:pageId" element={<SiteThemeEditor />} />
      </Route>
    </Route>
  );
}

import { lazy, type ReactNode } from "react";

import { PermissionRoute, TenantModuleRoute } from "@be-water/client-kit";
import { useTranslation } from "react-i18next";
import { Route } from "react-router";

const Site = lazy(() =>
  import("../pages/site.js").then((module) => ({
    default: module.Site,
  })),
);

const SiteFormSubmissions = lazy(() =>
  import("../pages/site-form-submissions.js").then((module) => ({
    default: module.SiteFormSubmissions,
  })),
);

const SiteMedia = lazy(() =>
  import("../pages/site-media.js").then((module) => ({
    default: module.SiteMedia,
  })),
);

const SiteRedirects = lazy(() =>
  import("../pages/site-redirects.js").then((module) => ({
    default: module.SiteRedirects,
  })),
);

const SiteDocs = lazy(() =>
  import("../pages/site-docs.js").then((module) => ({
    default: module.SiteDocs,
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
        <Route path="/app/site" element={<Site />} />
        <Route
          path="/app/site/form-submissions"
          element={<SiteFormSubmissions />}
        />
        <Route path="/app/site/media" element={<SiteMedia />} />
        <Route path="/app/site/redirects" element={<SiteRedirects />} />
        <Route path="/app/site/docs" element={<SiteDocs />} />
        <Route path="/app/site/pages/:pageId" element={<SiteThemeEditor />} />
      </Route>
    </Route>
  );
}

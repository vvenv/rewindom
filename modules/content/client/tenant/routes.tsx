import { lazy, type ReactNode } from "react";

import {
  PermissionRoute,
  TenantModuleRoute,
} from "@rewindom/module-sdk/client";
import { useTranslation } from "react-i18next";
import { Route } from "react-router";

const Contents = lazy(() =>
  import("../pages/contents.js").then((module) => ({
    default: module.Contents,
  })),
);

const ContentDetail = lazy(() =>
  import("../pages/content-detail.js").then((module) => ({
    default: module.ContentDetail,
  })),
);

function ContentModuleRoute() {
  const { t } = useTranslation("content");
  return <TenantModuleRoute moduleId="contents" label={t("title")} />;
}

export function renderContentsRoutes(): ReactNode {
  return (
    <Route element={<ContentModuleRoute />}>
      <Route element={<PermissionRoute permission="contents.read" />}>
        <Route path="/app/contents" element={<Contents />} />
        <Route path="/app/contents/:contentId" element={<ContentDetail />} />
      </Route>
    </Route>
  );
}

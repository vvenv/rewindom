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

const ContentTemplates = lazy(() =>
  import("../pages/content-templates.js").then((module) => ({
    default: module.ContentTemplates,
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
        {/* 静态段排在参数路由前面：`templates` 不能被当成一个 contentId */}
        <Route path="/app/contents/templates" element={<ContentTemplates />} />
        <Route path="/app/contents/:contentId" element={<ContentDetail />} />
      </Route>
    </Route>
  );
}

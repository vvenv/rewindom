import { lazy, type ReactNode } from "react";

import {
  PermissionRoute,
  TenantModuleRoute,
} from "@be-water/module-sdk/client";
import { useTranslation } from "react-i18next";
import { Route } from "react-router";

const Bookmarks = lazy(() =>
  import("./pages/bookmarks.js").then((module) => ({
    default: module.Bookmarks,
  })),
);

function BookmarkModuleRoute() {
  const { t } = useTranslation("bookmark");
  return <TenantModuleRoute moduleId="bookmark" label={t("title")} />;
}

export function renderBookmarkRoutes(): ReactNode {
  return (
    <Route element={<BookmarkModuleRoute />}>
      <Route element={<PermissionRoute permission="bookmark.read" />}>
        <Route path="/app/bookmarks" element={<Bookmarks />} />
      </Route>
    </Route>
  );
}

import { lazy, type ReactNode } from "react";

import { PermissionRoute } from "@be-water/client-kit";
import { Navigate, Route } from "react-router";

const SettingsBrandingPage = lazy(() =>
  import("../pages/settings-branding.js").then((module) => ({
    default: module.SettingsBrandingPage,
  })),
);

const SettingsOAuthPage = lazy(() =>
  import("../pages/settings-oauth.js").then((module) => ({
    default: module.SettingsOAuthPage,
  })),
);

export function renderPlatformTenantRoutes(): ReactNode {
  return (
    <Route element={<PermissionRoute permission="settings.read" />}>
      {/*
        每个 section 各占一个叶子路径，配合 nav 的 end:true 做精确匹配，
        避免 /app/settings 被 startsWith 命中而与 /app/settings/oauth 同时高亮。
        /app/settings 作为分组入口重定向到默认子页「品牌」，
        兼容 DEFAULT_HOME_PATH 与既有文档链接。
      */}
      <Route
        path="/app/settings"
        element={<Navigate to="/app/settings/branding" replace />}
      />
      <Route path="/app/settings/branding" element={<SettingsBrandingPage />} />
      <Route path="/app/settings/oauth" element={<SettingsOAuthPage />} />
    </Route>
  );
}

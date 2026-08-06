import { lazy, type ReactNode } from "react";

import { Route } from "react-router";

import {
  AppHomeRedirect,
  AppShellCssLoader,
  GuestOnlyRoute,
  PlatformAdminRoute,
  ProtectedRoute,
  PublicProviders,
  SuperUserRoute,
} from "@/shell/index";

import type { AppRouteTrees } from "./collect-modules";

const AppLayout = lazy(() =>
  import("@/shell/index").then((module) => ({
    default: module.AppLayout,
  })),
);

const PlatformLayout = lazy(() =>
  import("@/shell/index").then((module) => ({
    default: module.PlatformConsoleShell,
  })),
);

export function renderAppShellRoutes(trees: AppRouteTrees): ReactNode {
  return (
    <>
      {/* 公开路由不套任何守卫，且排在最前：官网 `/` 必须先于受保护的应用路由匹配。
          PublicProviders 是 pathless layout route，只注入上下文（如站点会员会话），
          不参与匹配也不做重定向。 */}
      <Route element={<PublicProviders />}>{trees.publicRoutes}</Route>

      <Route element={<AppShellCssLoader />}>
        <Route element={<GuestOnlyRoute />}>{trees.guestRoutes}</Route>

        <Route element={<ProtectedRoute />}>
          {/* 控制台稳定入口：官网等站外链接指向 `/app`，不必知道业务首页是哪个路径。
              未登录会先被 ProtectedRoute 送去登录页。 */}
          <Route path="/app" element={<AppHomeRedirect />} />

          <Route element={<AppLayout />}>{trees.tenantRoutes}</Route>

          <Route element={<SuperUserRoute />}>
            <Route element={<AppLayout />}>{trees.superUserRoutes}</Route>
          </Route>
        </Route>

        <Route element={<PlatformAdminRoute />}>
          <Route element={<PlatformLayout />}>{trees.platformRoutes}</Route>
        </Route>
      </Route>
    </>
  );
}

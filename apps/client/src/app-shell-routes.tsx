import { lazy, type ReactNode } from "react";

import { Route } from "react-router";

import {
  GuestOnlyRoute,
  PlatformAdminRoute,
  ProtectedRoute,
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
      <Route element={<GuestOnlyRoute />}>{trees.guestRoutes}</Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>{trees.tenantRoutes}</Route>

        <Route element={<SuperUserRoute />}>
          <Route element={<AppLayout />}>{trees.superUserRoutes}</Route>
        </Route>
      </Route>

      <Route element={<PlatformAdminRoute />}>
        <Route element={<PlatformLayout />}>{trees.platformRoutes}</Route>
      </Route>
    </>
  );
}

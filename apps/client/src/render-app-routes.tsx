import type { ReactNode } from "react";

import { configureClientTenantCatalog, registerDashboardWidgetsProvider, type ClientAppModule } from "@be-water/client-kit";


import type { AppShellConfig } from "@/shell/index";

import { buildAppShellConfig } from "./app-shell-config";
import { renderAppShellRoutes } from "./app-shell-routes";
import { collectAppRouteTrees, collectDashboardWidgets } from "./collect-modules";


export function prepareAppRoutes(
  modules: readonly ClientAppModule[],
): AppShellConfig {
  configureClientTenantCatalog(modules);
  // 工作台页在 `dashboard` 模块内，拿不到启用模块列表——由组装层把卡片注入进去。
  registerDashboardWidgetsProvider(() => collectDashboardWidgets(modules));
  return buildAppShellConfig(modules);
}

export function renderAppRoutes(
  modules: readonly ClientAppModule[],
): ReactNode {
  return renderAppShellRoutes(collectAppRouteTrees(modules));
}

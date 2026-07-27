import type { ReactNode } from "react";

import { configureClientTenantCatalog, type ClientAppModule } from "@be-water/client-kit";


import type { AppShellConfig } from "@/shell/index";

import { buildAppShellConfig } from "./app-shell-config";
import { renderAppShellRoutes } from "./app-shell-routes";
import { collectAppRouteTrees } from "./collect-modules";


export function prepareAppRoutes(
  modules: readonly ClientAppModule[],
): AppShellConfig {
  configureClientTenantCatalog(modules);
  return buildAppShellConfig(modules);
}

export function renderAppRoutes(
  modules: readonly ClientAppModule[],
): ReactNode {
  return renderAppShellRoutes(collectAppRouteTrees(modules));
}

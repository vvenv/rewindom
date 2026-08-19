import type { ReactNode } from "react";

import {
  configureClientTenantCatalog,
  registerDashboardWidgetsProvider,
  registerPlatformDashboardSectionsProvider,
  registerTenantSettingsPanelsProvider,
  type ClientAppModule,
} from "@rewindom/client-kit";

import type { AppShellConfig } from "@/shell/index";

import { buildAppShellConfig } from "./app-shell-config";
import { renderAppShellRoutes } from "./app-shell-routes";
import {
  collectAppRouteTrees,
  collectDashboardWidgets,
  collectPlatformDashboardSections,
  collectTenantSettingsPanels,
} from "./collect-modules";

export function prepareAppRoutes(
  modules: readonly ClientAppModule[],
): AppShellConfig {
  configureClientTenantCatalog(modules);
  // 工作台页在 `dashboard` 模块内，拿不到启用模块列表——由组装层把卡片注入进去。
  registerDashboardWidgetsProvider(() => collectDashboardWidgets(modules));
  // 平台监控页同理：区块由 slow-query / slow-request 等自己贡献。
  registerPlatformDashboardSectionsProvider(() =>
    collectPlatformDashboardSections(modules),
  );
  // 租户设置页在 `platform` 模块内，同理由贡献方（如 translation）自己登记面板。
  registerTenantSettingsPanelsProvider(() => collectTenantSettingsPanels(modules));
  return buildAppShellConfig(modules);
}

export function renderAppRoutes(
  modules: readonly ClientAppModule[],
): ReactNode {
  return renderAppShellRoutes(collectAppRouteTrees(modules));
}

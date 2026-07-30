import type { DashboardWidget } from "./module-contract.js";

let widgetsProvider: (() => readonly DashboardWidget[]) | null = null;

/**
 * 由组装层注册（`prepareAppRoutes`），与 `configureClientTenantCatalog` 同一处依赖倒置：
 * `dashboard` 模块要拿到「所有已启用模块贡献的卡片」，但模块不得 import
 * `ENABLED_CLIENT_MODULES`（那是 apps/client 组装层）。
 */
export function registerDashboardWidgetsProvider(
  provider: () => readonly DashboardWidget[],
): void {
  widgetsProvider = provider;
}

/** 未注册时返回空数组：预渲染、单测等没有组装层的环境也能渲染工作台骨架。 */
export function getDashboardWidgets(): readonly DashboardWidget[] {
  return widgetsProvider?.() ?? [];
}

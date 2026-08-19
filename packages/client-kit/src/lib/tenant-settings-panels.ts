import type { TenantSettingsPanel } from "./module-contract.js";

let panelsProvider: (() => readonly TenantSettingsPanel[]) | null = null;

/**
 * 由组装层注册（`prepareAppRoutes`），与 `registerPlatformDashboardSectionsProvider`
 * 同一处依赖倒置：`platform` 的设置页要拿到各模块贡献的面板，但模块不得
 * import `ENABLED_CLIENT_MODULES`，platform 也不得 import 贡献方。
 */
export function registerTenantSettingsPanelsProvider(
  provider: () => readonly TenantSettingsPanel[],
): void {
  panelsProvider = provider;
}

/** 未注册时返回空数组：单测里没有组装层也能渲染设置页骨架。 */
export function getTenantSettingsPanels(): readonly TenantSettingsPanel[] {
  return panelsProvider?.() ?? [];
}

export const DEFAULT_TENANT_SETTINGS_PANEL_ORDER = 100;

export function sortTenantSettingsPanels(
  panels: readonly TenantSettingsPanel[],
): TenantSettingsPanel[] {
  return panels
    .slice()
    .sort(
      (left, right) =>
        (left.order ?? DEFAULT_TENANT_SETTINGS_PANEL_ORDER) -
        (right.order ?? DEFAULT_TENANT_SETTINGS_PANEL_ORDER),
    );
}

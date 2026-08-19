import type { PlatformDashboardSection } from "./module-contract.js";

let sectionsProvider: (() => readonly PlatformDashboardSection[]) | null = null;

/**
 * 由组装层注册（`prepareAppRoutes`），与 `registerDashboardWidgetsProvider` 同一处依赖倒置：
 * `platform` 监控页要拿到各模块贡献的区块，但模块不得 import `ENABLED_CLIENT_MODULES`。
 */
export function registerPlatformDashboardSectionsProvider(
  provider: () => readonly PlatformDashboardSection[],
): void {
  sectionsProvider = provider;
}

/** 未注册时返回空数组：预渲染、单测等没有组装层的环境也能渲染监控骨架。 */
export function getPlatformDashboardSections(): readonly PlatformDashboardSection[] {
  return sectionsProvider?.() ?? [];
}

export const DEFAULT_PLATFORM_DASHBOARD_SECTION_ORDER = 100;

export function sortPlatformDashboardSections(
  sections: readonly PlatformDashboardSection[],
): PlatformDashboardSection[] {
  return sections
    .slice()
    .sort(
      (left, right) =>
        (left.order ?? DEFAULT_PLATFORM_DASHBOARD_SECTION_ORDER) -
        (right.order ?? DEFAULT_PLATFORM_DASHBOARD_SECTION_ORDER),
    );
}

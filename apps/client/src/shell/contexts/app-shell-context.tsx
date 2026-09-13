import { createContext, useContext, type ReactNode } from "react";

import type { CollectedShellContributions } from "../lib/shell-contributions.js";
import type {
  AppMobileHeaderState,
  AppNavItem,
  AppNavSection,
  CommandAction,
  HomePathCandidate,
  MobileTabItem,
  PlatformNavEntry,
} from "@rewindom/client-kit";
import type { Permission, TenantEntitlementsResponse } from "@rewindom/shared";


export interface AppShellConfig {
  getNavSections: () => AppNavSection[];
  filterNavSections: (
    sections: AppNavSection[],
    entitlements?: Pick<TenantEntitlementsResponse, "modules" | "features">,
    hasPermission?: (permission: Permission) => boolean,
  ) => AppNavSection[];
  getMobileTabItems: () => MobileTabItem[];
  filterMobileTabPaths: (
    paths: readonly string[],
    entitlements?: Pick<TenantEntitlementsResponse, "modules" | "features">,
    hasPermission?: (permission: Permission) => boolean,
  ) => string[];
  isNavRouteActive: (
    pathname: string,
    route: Pick<AppNavItem, "path" | "end" | "activePrefix">,
  ) => boolean;
  getAppNavItems: () => AppNavItem[];
  /** 命令面板的非导航动作；导航项由 `getNavSections` 供给，不在此重复。 */
  getCommandActions: () => readonly CommandAction[];
  resolveMobileHeaderState: (pathname: string) => AppMobileHeaderState;
  /** 登录落地页候选；禁用的 `tenantModule` 会被跳过。 */
  homePathCandidates: readonly HomePathCandidate[];
  shellContributions: CollectedShellContributions;
  platformNavEntries: readonly PlatformNavEntry[];
}

const AppShellContext = createContext<AppShellConfig | null>(null);

export function AppShellConfigProvider({
  value,
  children,
}: {
  value: AppShellConfig;
  children: ReactNode;
}): ReactNode {
  return (
    <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>
  );
}

export function useAppShellConfig(): AppShellConfig {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error("useAppShellConfig must be used within AppShellConfigProvider");
  }
  return context;
}

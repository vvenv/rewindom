import { createContext, useContext, type ReactNode } from "react";

import type { CollectedShellContributions } from "../lib/shell-contributions.js";
import type {
  AppMobileHeaderState,
  AppNavItem,
  AppNavSection,
  MobileTabItem,
  PlatformNavEntry,
} from "@be-water/client-kit";
import type { Permission, TenantEntitlementsResponse } from "@be-water/shared";


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
  resolveMobileHeaderState: (pathname: string) => AppMobileHeaderState;
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

import {
  filterAppNavSections,
  filterMobileTabPaths,
  getAppNavItems,
  getAppNavSections,
  getMobileTabItems,
  isAppNavItemActive,
  isNavRouteActive,
} from "@/app-nav";
import {
  AppShellConfigProvider,
  collectPlatformNav,
  collectShellContributions,
  resolveMobileHeaderState,
  type AppShellConfig,
} from "@/shell/index";


import type { ClientAppModule } from "@be-water/client-kit";

export function buildAppShellConfig(
  modules: readonly ClientAppModule[],
): AppShellConfig {
  return {
    getNavSections: getAppNavSections,
    filterNavSections: filterAppNavSections,
    getMobileTabItems,
    filterMobileTabPaths,
    isNavRouteActive,
    getAppNavItems,
    resolveMobileHeaderState: (pathname) =>
      resolveMobileHeaderState(
        pathname,
        modules,
        getAppNavItems,
        isAppNavItemActive,
      ),
    shellContributions: collectShellContributions(modules),
    platformNavEntries: collectPlatformNav(modules),
  };
}

export { AppShellConfigProvider };

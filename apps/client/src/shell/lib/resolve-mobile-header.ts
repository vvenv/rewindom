import { collectShellContributions } from "./shell-contributions.js";

import type {
  AppMobileHeaderState,
  AppNavItem,
  ClientAppModule,
} from "@be-water/client-kit";


export function resolveMobileHeaderState(
  pathname: string,
  modules: readonly ClientAppModule[],
  getNavItems: () => AppNavItem[],
  isNavItemActive: (pathname: string, item: AppNavItem) => boolean,
  fallbackTitle = "be-water",
): AppMobileHeaderState {
  const { mobileHeaderRoutes } = collectShellContributions(modules);

  for (const route of mobileHeaderRoutes) {
    if (route.match(pathname)) {
      return route.resolve(pathname);
    }
  }

  const navItem = getNavItems().find((item) => isNavItemActive(pathname, item));
  if (navItem) {
    return { title: navItem.label };
  }

  return { title: fallbackTitle };
}

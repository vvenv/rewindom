import { collectShellContributions } from "./shell-contributions.js";

import type {
  AppMobileHeaderState,
  AppNavItem,
  ClientAppModule,
} from "@rewindom/client-kit";
import { APP_DISPLAY_NAME } from "@rewindom/shared";

export function resolveMobileHeaderState(
  pathname: string,
  modules: readonly ClientAppModule[],
  getNavItems: () => AppNavItem[],
  isNavItemActive: (pathname: string, item: AppNavItem) => boolean,
  fallbackTitle = APP_DISPLAY_NAME,
): AppMobileHeaderState {
  const { mobileHeaderRoutes } = collectShellContributions(modules);

  for (const route of mobileHeaderRoutes) {
    if (route.match(pathname)) {
      return route.resolve(pathname);
    }
  }

  const navItem = getNavItems().find((item) => isNavItemActive(pathname, item));
  if (navItem) {
    return { title: navItem.title ?? navItem.label };
  }

  return { title: fallbackTitle };
}

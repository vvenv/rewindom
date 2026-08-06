export { appShellClientModule } from "./module.js";

export { useAppHomePath } from "./hooks/useAppHomePath.js";

export { AppLayout } from "./components/AppLayout.js";
export { AppMobileHeader } from "./components/AppMobileHeader.js";
export { AppHomeRedirect } from "./components/AppHomeRedirect.js";
export { AppNotFoundRedirect } from "./components/AppNotFoundRedirect.js";
export { GuestOnlyRoute } from "./components/GuestOnlyRoute.js";
export { PlatformAdminRoute } from "./components/PlatformAdminRoute.js";
export { ProtectedRoute } from "./components/ProtectedRoute.js";
export { PublicProviders } from "./components/PublicProviders.js";
export { SuperUserRoute } from "./components/SuperUserRoute.js";
export {
  DesktopSidebar,
  MobileNavDrawer,
  MobileTabBar,
} from "./components/Sidebar.js";
export { TopBar } from "./components/TopBar.js";
export { PlatformConsoleShell } from "./components/PlatformConsoleShell.js";

export {
  AppShellConfigProvider,
  useAppShellConfig,
  type AppShellConfig,
} from "./contexts/app-shell-context.js";
export {
  NavBadgeRegistryProvider,
  useNavBadgeCount,
  useNavBadgeRegistry,
} from "@be-water/client-kit";

export { collectShellContributions } from "./lib/shell-contributions.js";
export { collectPlatformNav } from "./lib/collect-platform-nav.js";
export { resolveMobileHeaderState } from "./lib/resolve-mobile-header.js";
export { renderAppShellGuestRoutes } from "./guest-routes.js";
export { renderAppShellPublicRoutes } from "./public-routes.js";

export type { CollectedShellContributions } from "./lib/shell-contributions.js";

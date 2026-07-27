import type { ComponentType, LazyExoticComponent, ReactNode } from "react";

import { type ModuleManifestBase, type Permission, type TenantFeatureKey  } from "@be-water/shared";

import type { AppNavSection } from "./app-nav-types.js";
import type { PlatformNavContribution } from "./platform-nav-types.js";


export interface ClientRouteDefinition {
  path: string;
  element: LazyExoticComponent<ComponentType>;
  permission?: Permission | Permission[];
  tenantFeature?: TenantFeatureKey;
  children?: ClientRouteDefinition[];
}

export interface AppMobileHeaderBack {
  to: string;
  label: string;
}

export interface AppMobileHeaderState {
  title: string;
  back?: AppMobileHeaderBack;
}

export interface MobileHeaderRouteDefinition {
  match: (pathname: string) => boolean;
  resolve: (pathname: string) => AppMobileHeaderState;
}

export interface SidebarSlotProps {
  homePath: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}

export interface SidebarUserMenuSlotProps {
  collapsed?: boolean;
  showLabel?: boolean;
}

export interface AuthLoginHeroProps {
  variant: "desktop" | "compact";
}

export interface ClientShellContributions {
  /** 登录页左侧/移动端 Hero；未提供时使用壳层默认中性文案。 */
  authLoginHero?: ComponentType<AuthLoginHeroProps>;
  shellProviders?: Array<ComponentType<{ children: ReactNode }>>;
  sidebarToolbar?: ComponentType;
  sidebarPrimaryAction?: ComponentType<SidebarSlotProps>;
  sidebarPanel?: ComponentType<SidebarSlotProps>;
  sidebarUserMenu?: ComponentType<SidebarUserMenuSlotProps>;
  mobileHeaderTrailing?: ComponentType;
  navBadge?: ComponentType;
  /** Platform console sidebar badge contributor (e.g. pending review count). */
  platformNavBadge?: ComponentType;
  useImpersonationActive?: () => boolean;
  mobileHeaderRoutes?: readonly MobileHeaderRouteDefinition[];
}

export interface ClientAppModule extends ModuleManifestBase {
  client?: {
    routes?: ClientRouteDefinition[];
    renderGuestRoutes?: () => ReactNode;
    renderTenantRoutes?: () => ReactNode;
    renderRoutes?: () => ReactNode;
    renderSuperUserRoutes?: () => ReactNode;
    renderPlatformRoutes?: () => ReactNode;
    nav?: AppNavSection[];
    platformNav?: readonly PlatformNavContribution[];
    mobileTabPaths?: readonly string[];
    shell?: ClientShellContributions;
  };
}

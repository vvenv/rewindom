import type { ComponentType, ReactNode } from "react";

import type {
  AuthLoginHeroProps,
  ClientAppModule,
  ClientShellContributions,
  MobileHeaderRouteDefinition,
  SidebarSlotProps,
  SidebarUserMenuSlotProps,
} from "@rewindom/client-kit";

export interface CollectedShellContributions {
  authLoginHero?: ComponentType<AuthLoginHeroProps>;
  shellProviders: Array<ComponentType<{ children: ReactNode }>>;
  publicProviders: Array<ComponentType<{ children: ReactNode }>>;
  sidebarToolbar: Array<ComponentType>;
  sidebarPrimaryAction: Array<ComponentType<SidebarSlotProps>>;
  sidebarPanel: Array<ComponentType<SidebarSlotProps>>;
  sidebarUserMenu: Array<ComponentType<SidebarUserMenuSlotProps>>;
  mobileHeaderTrailing: Array<ComponentType>;
  navBadge: Array<ComponentType>;
  platformNavBadge: Array<ComponentType>;
  useImpersonationActive?: () => boolean;
  mobileHeaderRoutes: MobileHeaderRouteDefinition[];
}

function pushContribution<T>(
  target: T[],
  value: T | undefined,
): void {
  if (value) {
    target.push(value);
  }
}

export function collectShellContributions(
  modules: readonly ClientAppModule[],
): CollectedShellContributions {
  const collected: CollectedShellContributions = {
    shellProviders: [],
    publicProviders: [],
    sidebarToolbar: [],
    sidebarPrimaryAction: [],
    sidebarPanel: [],
    sidebarUserMenu: [],
    mobileHeaderTrailing: [],
    navBadge: [],
    platformNavBadge: [],
    mobileHeaderRoutes: [],
  };

  for (const module of modules) {
    const shell: ClientShellContributions | undefined = module.client?.shell;
    if (!shell) {
      continue;
    }

    if (shell.shellProviders) {
      collected.shellProviders.push(...shell.shellProviders);
    }
    if (shell.publicProviders) {
      collected.publicProviders.push(...shell.publicProviders);
    }
    pushContribution(collected.sidebarToolbar, shell.sidebarToolbar);
    pushContribution(collected.sidebarPrimaryAction, shell.sidebarPrimaryAction);
    pushContribution(collected.sidebarPanel, shell.sidebarPanel);
    pushContribution(collected.sidebarUserMenu, shell.sidebarUserMenu);
    pushContribution(collected.mobileHeaderTrailing, shell.mobileHeaderTrailing);
    pushContribution(collected.navBadge, shell.navBadge);
    pushContribution(collected.platformNavBadge, shell.platformNavBadge);

    if (shell.mobileHeaderRoutes) {
      collected.mobileHeaderRoutes.push(...shell.mobileHeaderRoutes);
    }

    if (shell.useImpersonationActive && !collected.useImpersonationActive) {
      collected.useImpersonationActive = shell.useImpersonationActive;
    }

    if (shell.authLoginHero && !collected.authLoginHero) {
      collected.authLoginHero = shell.authLoginHero;
    }
  }

  return collected;
}

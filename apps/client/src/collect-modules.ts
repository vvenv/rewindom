import type { ReactNode } from "react";


import { type ClientAppModule, type AppNavSection  } from "@be-water/client-kit";

import { renderModuleDeclarativeRoutes } from "./declarative-routes";


type ClientRouteMountKey =
  | "renderGuestRoutes"
  | "renderSuperUserRoutes"
  | "renderPlatformRoutes";

export interface AppRouteTrees {
  guestRoutes: ReactNode;
  tenantRoutes: ReactNode;
  superUserRoutes: ReactNode;
  platformRoutes: ReactNode;
}

export function collectModuleNav(
  modules: readonly ClientAppModule[],
): AppNavSection[] {
  const sectionOrder: string[] = [];
  const sectionItems = new Map<string, AppNavSection["items"]>();
  const sectionPlacements = new Map<string, NonNullable<AppNavSection["placement"]>>();

  for (const module of modules) {
    if (!module.client?.nav) {
      continue;
    }
    for (const section of module.client.nav) {
      if (!sectionItems.has(section.label)) {
        sectionItems.set(section.label, []);
        sectionOrder.push(section.label);
        sectionPlacements.set(section.label, section.placement ?? "main");
      } else if (section.placement === "end") {
        // 任一贡献方声明 end 即沉底（同 label 合并时保持一致）。
        sectionPlacements.set(section.label, "end");
      }
      sectionItems.get(section.label)!.push(...section.items);
    }
  }

  return sectionOrder.map((label) => {
    const placement = sectionPlacements.get(label) ?? "main";
    return {
      label,
      items: sectionItems.get(label)!,
      ...(placement === "end" ? { placement: "end" as const } : {}),
    };
  });
}

export function collectMobileTabPaths(
  modules: readonly ClientAppModule[],
): readonly string[] {
  const paths: string[] = [];
  for (const module of modules) {
    if (module.client?.mobileTabPaths) {
      paths.push(...module.client.mobileTabPaths);
    }
  }
  return paths;
}

function collectMountedRoutes(
  modules: readonly ClientAppModule[],
  mountKey: ClientRouteMountKey,
): ReactNode {
  const nodes: ReactNode[] = [];

  for (const module of modules) {
    const render = module.client?.[mountKey];
    if (render) {
      nodes.push(render());
    }
  }

  return nodes;
}

function collectTenantRoutes(modules: readonly ClientAppModule[]): ReactNode {
  const nodes: ReactNode[] = [];

  for (const module of modules) {
    const client = module.client;
    if (!client) {
      continue;
    }

    const render = client.renderTenantRoutes ?? client.renderRoutes;
    if (render) {
      nodes.push(render());
    }

    if (client.routes?.length) {
      nodes.push(renderModuleDeclarativeRoutes(module.id, client.routes));
    }
  }

  return nodes;
}

export function collectAppRouteTrees(
  modules: readonly ClientAppModule[],
): AppRouteTrees {
  return {
    guestRoutes: collectMountedRoutes(modules, "renderGuestRoutes"),
    tenantRoutes: collectTenantRoutes(modules),
    superUserRoutes: collectMountedRoutes(modules, "renderSuperUserRoutes"),
    platformRoutes: collectMountedRoutes(modules, "renderPlatformRoutes"),
  };
}

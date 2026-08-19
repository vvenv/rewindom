import type { ReactNode } from "react";

import {
  type ClientAppModule,
  type AppNavSection,
  type DashboardWidget,
  type PlatformDashboardSection,
  type TenantSettingsPanel,
} from "@rewindom/client-kit";

import { renderModuleDeclarativeRoutes } from "./declarative-routes";

type ClientRouteMountKey =
  | "renderPublicRoutes"
  | "renderGuestRoutes"
  | "renderSuperUserRoutes"
  | "renderPlatformRoutes";

export interface AppRouteTrees {
  publicRoutes: ReactNode;
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
  const sectionPlacements = new Map<
    string,
    NonNullable<AppNavSection["placement"]>
  >();

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

/**
 * 汇总各模块贡献的工作台卡片。同 id 只保留**先注册**的那个：模块顺序即优先级，
 * 与 `collectModuleNav` 一致；重复 id 多半是复制粘贴，静默叠加会渲染出两张一样的卡片。
 */
export function collectDashboardWidgets(
  modules: readonly ClientAppModule[],
): readonly DashboardWidget[] {
  const byId = new Map<string, DashboardWidget>();
  for (const module of modules) {
    for (const widget of module.client?.dashboardWidgets ?? []) {
      if (!byId.has(widget.id)) {
        byId.set(widget.id, widget);
      }
    }
  }
  return [...byId.values()];
}

/**
 * 汇总各模块贡献的平台监控区块。同 id 只保留先注册的那个，与 `collectDashboardWidgets` 一致。
 */
export function collectPlatformDashboardSections(
  modules: readonly ClientAppModule[],
): readonly PlatformDashboardSection[] {
  const byId = new Map<string, PlatformDashboardSection>();
  for (const module of modules) {
    for (const section of module.client?.platformDashboardSections ?? []) {
      if (!byId.has(section.id)) {
        byId.set(section.id, section);
      }
    }
  }
  return [...byId.values()];
}

/**
 * 汇总各模块贡献的租户设置面板。同 id 只保留先注册的那个，与上面两个收集器一致。
 */
export function collectTenantSettingsPanels(
  modules: readonly ClientAppModule[],
): readonly TenantSettingsPanel[] {
  const byId = new Map<string, TenantSettingsPanel>();
  for (const module of modules) {
    for (const panel of module.client?.tenantSettingsPanels ?? []) {
      if (!byId.has(panel.id)) {
        byId.set(panel.id, panel);
      }
    }
  }
  return [...byId.values()];
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
    publicRoutes: collectMountedRoutes(modules, "renderPublicRoutes"),
    guestRoutes: collectMountedRoutes(modules, "renderGuestRoutes"),
    tenantRoutes: collectTenantRoutes(modules),
    superUserRoutes: collectMountedRoutes(modules, "renderSuperUserRoutes"),
    platformRoutes: collectMountedRoutes(modules, "renderPlatformRoutes"),
  };
}

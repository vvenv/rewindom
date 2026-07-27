import {
  Activity,
  Building2,
  LayoutDashboard,
  Settings,
  Shield,
} from "lucide-react";

import type {
  ClientAppModule,
  PlatformNavChild,
  PlatformNavContribution,
  PlatformNavEntry,
  PlatformNavGroup,
  PlatformNavGroupKey,
  PlatformNavLink,
} from "@be-water/client-kit";

const DASHBOARD_LINK: PlatformNavLink = {
  type: "link",
  to: "/platform",
  label: "监控",
  icon: LayoutDashboard,
  end: true,
};

const SETTINGS_LINK: PlatformNavLink = {
  type: "link",
  to: "/platform/settings",
  label: "设置",
  icon: Settings,
};

function createNavGroup(
  key: string,
  label: string,
  icon: PlatformNavGroup["icon"],
  children: readonly PlatformNavChild[],
): PlatformNavGroup {
  return { type: "group", key, label, icon, children };
}

/** 壳层固定分组；业务模块通过 `platformNav` 的 `group-children` 向 observability 等分组追加子项。 */
const SHELL_NAV_GROUPS = {
  tenantAdmin: createNavGroup("tenant-admin", "租户", Building2, [
    { to: "/platform/tenants", label: "租户管理", end: true },
    { to: "/platform/users", label: "跨租户用户", end: true },
  ]),
  access: createNavGroup("access", "权限", Shield, [
    { to: "/platform/admins", label: "平台管理员", end: true },
  ]),
  observability: createNavGroup("observability", "运维", Activity, []),
} as const satisfies Record<string, PlatformNavGroup>;

function collectContributions(modules: readonly ClientAppModule[]): {
  groupChildren: Partial<Record<PlatformNavGroupKey, PlatformNavChild[]>>;
  rootLinks: PlatformNavLink[];
} {
  const groupChildren: Partial<
    Record<PlatformNavGroupKey, PlatformNavChild[]>
  > = {};
  const rootLinkItems: Array<{ order: number; link: PlatformNavLink }> = [];

  for (const module of modules) {
    const contributions: readonly PlatformNavContribution[] =
      module.client?.platformNav ?? [];
    for (const contribution of contributions) {
      if (contribution.kind === "group-children") {
        const bucket = groupChildren[contribution.group] ?? [];
        bucket.push(...contribution.children);
        groupChildren[contribution.group] = bucket;
        continue;
      }

      rootLinkItems.push({
        order: contribution.order,
        link: {
          type: "link",
          to: contribution.to,
          label: contribution.label,
          icon: contribution.icon,
          end: contribution.end,
        },
      });
    }
  }

  rootLinkItems.sort((left, right) => left.order - right.order);

  return {
    groupChildren,
    rootLinks: rootLinkItems.map((item) => item.link),
  };
}

export function collectPlatformNav(
  modules: readonly ClientAppModule[],
): readonly PlatformNavEntry[] {
  const { groupChildren, rootLinks } = collectContributions(modules);

  const observabilityGroup: PlatformNavGroup = {
    ...SHELL_NAV_GROUPS.observability,
    children: groupChildren.observability ?? [],
  };

  return [
    DASHBOARD_LINK,
    ...rootLinks,
    SHELL_NAV_GROUPS.tenantAdmin,
    SHELL_NAV_GROUPS.access,
    observabilityGroup,
    SETTINGS_LINK,
  ];
}

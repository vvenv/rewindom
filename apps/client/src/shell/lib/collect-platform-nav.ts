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
} from "@rewindom/client-kit";

const DASHBOARD_LINK: PlatformNavLink = {
  type: "link",
  to: "/platform",
  label: "platform:nav.dashboard",
  icon: LayoutDashboard,
  end: true,
};

const SETTINGS_LINK: PlatformNavLink = {
  type: "link",
  to: "/platform/settings",
  label: "platform:nav.settings",
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
  tenantAdmin: createNavGroup(
    "tenant-admin",
    "platform:nav.groupTenant",
    Building2,
    [
      { to: "/platform/tenants", label: "platform:nav.tenants", end: true },
      { to: "/platform/users", label: "platform:nav.users", end: true },
    ],
  ),
  access: createNavGroup("access", "platform:nav.groupAccess", Shield, [
    { to: "/platform/admins", label: "platform:nav.admins", end: true },
  ]),
  observability: createNavGroup(
    "observability",
    "platform:nav.groupObservability",
    Activity,
    [],
  ),
} as const satisfies Record<string, PlatformNavGroup>;

function collectContributions(modules: readonly ClientAppModule[]): {
  groupChildren: Partial<Record<PlatformNavGroupKey, PlatformNavChild[]>>;
  rootLinks: PlatformNavLink[];
} {
  const groupChildItems: Partial<
    Record<
      PlatformNavGroupKey,
      Array<{ order: number; children: readonly PlatformNavChild[] }>
    >
  > = {};
  const rootLinkItems: Array<{ order: number; link: PlatformNavLink }> = [];

  for (const module of modules) {
    const contributions: readonly PlatformNavContribution[] =
      module.client?.platformNav ?? [];
    for (const contribution of contributions) {
      if (contribution.kind === "group-children") {
        const bucket = groupChildItems[contribution.group] ?? [];
        bucket.push({
          order: contribution.order ?? 100,
          children: contribution.children,
        });
        groupChildItems[contribution.group] = bucket;
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

  const groupChildren: Partial<Record<PlatformNavGroupKey, PlatformNavChild[]>> =
    {};
  for (const [group, items] of Object.entries(groupChildItems) as Array<
    [
      PlatformNavGroupKey,
      Array<{ order: number; children: readonly PlatformNavChild[] }>,
    ]
  >) {
    items.sort((left, right) => left.order - right.order);
    groupChildren[group] = items.flatMap((item) => [...item.children]);
  }

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

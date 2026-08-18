import {
  Activity,
  Building2,
  CreditCard,
  LayoutDashboard,
  Settings,
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

function createNavGroup(
  key: string,
  label: string,
  icon: PlatformNavGroup["icon"],
  children: readonly PlatformNavChild[],
): PlatformNavGroup {
  return { type: "group", key, label, icon, children };
}

/**
 * 壳层固定分组。业务模块通过 `platformNav` 的 `group-children` 往 commerce /
 * observability 追加子项；租户组由壳层写死（单租户过滤只藏这一组里的租户管理）。
 *
 * 顺序：监控 → 租户 → 计费 → 运维 → 设置。
 */
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
  commerce: createNavGroup(
    "commerce",
    "platform:nav.groupCommerce",
    CreditCard,
    [],
  ),
  observability: createNavGroup(
    "observability",
    "platform:nav.groupObservability",
    Activity,
    [],
  ),
  settings: createNavGroup("settings", "platform:nav.groupSettings", Settings, [
    { to: "/platform/admins", label: "platform:nav.admins", end: true },
    { to: "/platform/settings", label: "platform:nav.settings" },
  ]),
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

function withChildren(
  group: PlatformNavGroup,
  children: readonly PlatformNavChild[],
): PlatformNavGroup | null {
  if (children.length === 0) {
    return null;
  }
  return { ...group, children };
}

export function collectPlatformNav(
  modules: readonly ClientAppModule[],
): readonly PlatformNavEntry[] {
  const { groupChildren, rootLinks } = collectContributions(modules);

  return [
    DASHBOARD_LINK,
    ...rootLinks,
    SHELL_NAV_GROUPS.tenantAdmin,
    withChildren(SHELL_NAV_GROUPS.commerce, groupChildren.commerce ?? []),
    withChildren(
      SHELL_NAV_GROUPS.observability,
      groupChildren.observability ?? [],
    ),
    SHELL_NAV_GROUPS.settings,
  ].filter((entry): entry is PlatformNavEntry => entry != null);
}

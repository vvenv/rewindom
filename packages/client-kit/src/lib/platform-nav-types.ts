import type { ComponentType } from "react";

export interface PlatformNavChild {
  to: string;
  label: string;
  end?: boolean;
  badgeKey?: string;
}

export interface PlatformNavLink {
  type: "link";
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
}

export interface PlatformNavGroup {
  type: "group";
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  children: readonly PlatformNavChild[];
}

export type PlatformNavEntry = PlatformNavLink | PlatformNavGroup;

/** 平台侧边栏的固定分组。业务模块自建分组请用 `kind: "link"` 贡献根级入口。 */
export type PlatformNavGroupKey = "observability";

export type PlatformNavContribution =
  | {
      kind: "group-children";
      group: PlatformNavGroupKey;
      children: readonly PlatformNavChild[];
    }
  | {
      kind: "link";
      /** Root-level link order; lower appears earlier (after dashboard). */
      order: number;
      to: string;
      label: string;
      icon: ComponentType<{ className?: string }>;
      end?: boolean;
    };

export function isNavChildActive(
  pathname: string,
  to: string,
  end?: boolean,
  search = "",
): boolean {
  const [toPath, toQuery = ""] = to.split("?");
  const pathMatch = end
    ? pathname === toPath
    : pathname === toPath || pathname.startsWith(`${toPath}/`);

  if (!pathMatch) return false;

  const current = new URLSearchParams(search);
  const expected = new URLSearchParams(toQuery);

  if (toQuery) {
    let queryMatches = true;
    expected.forEach((value, key) => {
      if (queryMatches && current.get(key) !== value) {
        queryMatches = false;
      }
    });
    return queryMatches;
  }

  return true;
}

export function isNavGroupActive(
  pathname: string,
  group: PlatformNavGroup,
  search = "",
): boolean {
  return group.children.some((child) =>
    isNavChildActive(pathname, child.to, child.end, search),
  );
}

export function getPlatformPageTitle(
  entries: readonly PlatformNavEntry[],
  pathname: string,
  search = "",
): string {
  const platformPageTitles: Record<string, string> = {
    "/platform": "监控面板",
    "/platform/tenants": "租户管理",
    "/platform/users": "跨租户用户",
    "/platform/admins": "平台管理员",
    "/platform/audit-logs": "审计日志",
    "/platform/error-logs": "错误日志",
    "/platform/slow-query-logs": "慢查询",
    "/platform/settings": "平台设置",
  };

  for (const entry of entries) {
    if (entry.type === "group") {
      const child = entry.children.find((item) =>
        isNavChildActive(pathname, item.to, item.end, search),
      );
      if (child) {
        return child.label;
      }
    }
  }

  if (platformPageTitles[pathname]) {
    return platformPageTitles[pathname];
  }

  const activeLink = entries.find(
    (entry): entry is PlatformNavLink =>
      entry.type === "link" &&
      (entry.end ? pathname === entry.to : pathname.startsWith(entry.to)),
  );

  return activeLink?.label ?? "平台管理";
}

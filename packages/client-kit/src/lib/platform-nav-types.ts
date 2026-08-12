import type { ComponentType } from "react";

import { resolveNavLabel } from "../i18n/translate-nav.js";

import type { TFunction } from "i18next";


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
      /**
       * Order within the group; lower appears earlier.
       * Defaults to 100 so destructive/ops entries can sit after log viewers.
       */
      order?: number;
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
  t?: TFunction,
): string {
  const platformPageTitleKeys: Record<string, string> = {
    "/platform": "platform:nav.pageTitles./platform",
    "/platform/tenants": "platform:nav.pageTitles./platform/tenants",
    "/platform/users": "platform:nav.pageTitles./platform/users",
    "/platform/admins": "platform:nav.pageTitles./platform/admins",
    "/platform/audit-logs": "platform:nav.pageTitles./platform/audit-logs",
    "/platform/error-logs": "platform:nav.pageTitles./platform/error-logs",
    "/platform/slow-query-logs":
      "platform:nav.pageTitles./platform/slow-query-logs",
    "/platform/backup": "platform:nav.pageTitles./platform/backup",
    "/platform/plans": "platform:nav.pageTitles./platform/plans",
    "/platform/settings": "platform:nav.pageTitles./platform/settings",
    "/platform/billing": "platform:nav.pageTitles./platform/billing",
  };

  for (const entry of entries) {
    if (entry.type === "group") {
      const child = entry.children.find((item) =>
        isNavChildActive(pathname, item.to, item.end, search),
      );
      if (child) {
        return t ? resolveNavLabel(child.label, t) : child.label;
      }
    }
  }

  const titleKey = platformPageTitleKeys[pathname];
  if (titleKey) {
    return t ? resolveNavLabel(titleKey, t) : titleKey;
  }

  const activeLink = entries.find(
    (entry): entry is PlatformNavLink =>
      entry.type === "link" &&
      (entry.end ? pathname === entry.to : pathname.startsWith(entry.to)),
  );

  if (activeLink) {
    return t ? resolveNavLabel(activeLink.label, t) : activeLink.label;
  }

  return t
    ? resolveNavLabel("platform:nav.fallbackTitle", t)
    : "平台管理";
}

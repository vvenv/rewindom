import {
  type AppNavItem,
  type AppNavSection,
  type MobileTabItem,
} from "@rewindom/client-kit";
import { type Permission, type TenantEntitlementsResponse } from "@rewindom/shared";

import { collectMobileTabPaths, collectModuleNav } from "@/collect-modules";
import { ENABLED_CLIENT_MODULES } from "@/enabled-modules";

export type { AppNavItem, AppNavSection, MobileTabItem };

export function getAppNavSections(): AppNavSection[] {
  return collectModuleNav(ENABLED_CLIENT_MODULES);
}

/** 判定当前用户是否具备某权限；未传时按「尚未加载」处理，见 `isNavItemVisible`。 */
export type HasPermission = (permission: Permission) => boolean;

export function filterAppNavSections(
  sections: AppNavSection[],
  entitlements?: Pick<TenantEntitlementsResponse, "modules" | "features">,
  hasPermission?: HasPermission,
): AppNavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        isNavItemVisible(item, entitlements, hasPermission),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

/** 按 `placement` 拆分；顶栏用合并后的 `sections`（end 排在 main 之后）。 */
export function partitionNavSections(sections: AppNavSection[]): {
  mainSections: AppNavSection[];
  endSections: AppNavSection[];
  sections: AppNavSection[];
} {
  const mainSections = sections.filter((section) => section.placement !== "end");
  const endSections = sections.filter((section) => section.placement === "end");
  return {
    mainSections,
    endSections,
    sections: [...mainSections, ...endSections],
  };
}

function isNavItemVisible(
  item: AppNavItem,
  entitlements?: Pick<TenantEntitlementsResponse, "modules" | "features">,
  hasPermission?: HasPermission,
): boolean {
  // 权限维度 fail-closed：权限未加载时隐藏受限入口，避免先闪出「用户管理」
  // 再被 SuperUserRoute 弹回首页。entitlement 维度沿用既有的 fail-open。
  if (item.anyPermission && item.anyPermission.length > 0) {
    if (!hasPermission) {
      return false;
    }
    if (!item.anyPermission.some((permission) => hasPermission(permission))) {
      return false;
    }
  }

  if (!entitlements) {
    return true;
  }

  if (item.tenantModule && entitlements.modules[item.tenantModule] === false) {
    return false;
  }

  if (item.tenantFeature && !entitlements.features[item.tenantFeature]) {
    return false;
  }

  return true;
}

export function filterMobileTabPaths(
  paths: readonly string[],
  entitlements?: Pick<TenantEntitlementsResponse, "modules" | "features">,
  hasPermission?: HasPermission,
): string[] {
  const visiblePaths = new Set(
    filterAppNavSections(
      getAppNavSections(),
      entitlements,
      hasPermission,
    ).flatMap((section) => section.items.map((item) => item.path)),
  );
  return paths.filter((path) => visiblePaths.has(path));
}

export function isNavRouteActive(
  pathname: string,
  route: Pick<AppNavItem, "path" | "end" | "activePrefix">,
): boolean {
  if (route.activePrefix) {
    return (
      pathname === route.activePrefix ||
      pathname.startsWith(`${route.activePrefix}/`)
    );
  }

  return route.end ? pathname === route.path : pathname.startsWith(route.path);
}

export function isAppNavItemActive(
  pathname: string,
  item: AppNavItem,
): boolean {
  return isNavRouteActive(pathname, item);
}

export function getAppNavItems(): AppNavItem[] {
  return getAppNavSections().flatMap((section) => section.items);
}

export function getMobileTabItems(): MobileTabItem[] {
  const byPath = new Map(getAppNavItems().map((item) => [item.path, item]));
  return collectMobileTabPaths(ENABLED_CLIENT_MODULES).flatMap((path) => {
    const item = byPath.get(path);
    if (!item) {
      return [];
    }
    return [
      {
        icon: item.icon,
        label: item.mobileLabel ?? item.label,
        path: item.path,
        // `end` 必须带上：MobileTabBar 用它做精确匹配，漏了会让 `/` 这类
        // 前缀路径在所有子路由下都显示为激活。
        end: item.end,
        badgeKey: item.badgeKey,
        activePrefix: item.activePrefix,
      },
    ];
  });
}

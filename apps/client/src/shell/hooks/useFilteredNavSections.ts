import { useMemo } from "react";

import {
  useTenantEntitlements,
  usePermissions,
  type AppNavItem,
  type AppNavSection,
} from "@be-water/client-kit";

import { useAppShellConfig } from "../contexts/app-shell-context.js";

/** 左右布局的侧边栏与上下布局的顶栏共用同一份过滤后的导航。 */
export function useFilteredNavSections(): {
  sections: AppNavSection[];
  isLoading: boolean;
} {
  const { getNavSections, filterNavSections } = useAppShellConfig();
  const { data, isLoading } = useTenantEntitlements();
  const { hasPermission, isLoading: isLoadingPermissions } = usePermissions();

  const sections = useMemo(
    () => filterNavSections(getNavSections(), data, hasPermission),
    [data, filterNavSections, getNavSections, hasPermission],
  );

  return { sections, isLoading: isLoading || isLoadingPermissions };
}

export function getNavBadgeTitle(
  badgeKey: AppNavItem["badgeKey"],
  taskCount: number,
): string | undefined {
  if (badgeKey === "tasks" && taskCount > 0) {
    return `${taskCount} 项待办任务`;
  }
  return undefined;
}

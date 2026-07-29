import { useMemo } from "react";

import {
  useTenantEntitlements,
  usePermissions,
  type AppNavItem,
  type AppNavSection,
} from "@be-water/client-kit";

import { partitionNavSections } from "@/app-nav";

import { useAppShellConfig } from "../contexts/app-shell-context.js";

/** 左右布局的侧边栏与上下布局的顶栏共用同一份过滤后的导航。 */
export function useFilteredNavSections(): {
  /** main 在前、end 在后，供顶栏等按顺序渲染。 */
  sections: AppNavSection[];
  mainSections: AppNavSection[];
  endSections: AppNavSection[];
  isLoading: boolean;
} {
  const { getNavSections, filterNavSections } = useAppShellConfig();
  const { data, isLoading } = useTenantEntitlements();
  const { hasPermission, isLoading: isLoadingPermissions } = usePermissions();

  const filtered = useMemo(
    () => filterNavSections(getNavSections(), data, hasPermission),
    [data, filterNavSections, getNavSections, hasPermission],
  );

  const { mainSections, endSections, sections } = useMemo(
    () => partitionNavSections(filtered),
    [filtered],
  );

  return {
    sections,
    mainSections,
    endSections,
    isLoading: isLoading || isLoadingPermissions,
  };
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

import { useMemo } from "react";

import {
  translateAppNavSections,
  useTenantEntitlements,
  usePermissions,
  type AppNavItem,
  type AppNavSection,
} from "@rewindom/client-kit";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation([
    "user",
    "common",
    "shell",
    "billing",
    "rbac",
    "dashboard",
    "audit",
    "error-log",
    "note",
    "todo",
    "notification",
    "background-job",
  ]);

  const filtered = useMemo(
    () =>
      filterNavSections(
        translateAppNavSections(getNavSections(), t),
        data,
        hasPermission,
      ),
    [data, filterNavSections, getNavSections, hasPermission, t],
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
  t?: (key: string, options?: { count?: number; ns?: string }) => string,
): string | undefined {
  if (badgeKey === "tasks" && taskCount > 0) {
    if (t) {
      return t("tasksBadge", { count: taskCount, ns: "common" });
    }
    return `${taskCount} 项待办任务`;
  }
  return undefined;
}

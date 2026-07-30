import { useMemo } from "react";

import {
  getDashboardWidgets,
  usePermissions,
  useTenantEntitlements,
  type DashboardWidget,
} from "@be-water/client-kit";

import { selectVisibleDashboardWidgets } from "../lib/dashboard-widgets.js";

/** 当前用户在当前租户下可见的工作台卡片（已按 `order` 排序）。 */
export function useDashboardWidgets(): DashboardWidget[] {
  const { data: entitlements } = useTenantEntitlements();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();

  return useMemo(
    () =>
      // 注册表在组装层启动时写入且此后不变，可以在 memo 内读。
      selectVisibleDashboardWidgets(
        getDashboardWidgets(),
        entitlements,
        permissionsLoading ? undefined : hasPermission,
      ),
    [entitlements, hasPermission, permissionsLoading],
  );
}

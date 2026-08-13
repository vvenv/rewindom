import { useMemo } from "react";

import {
  getDashboardWidgets,
  usePermissions,
  useTenantEntitlements,
  type DashboardWidget,
} from "@rewindom/client-kit";

import {
  applyDashboardPreference,
  selectVisibleDashboardWidgets,
} from "../lib/dashboard-widgets.js";

import { useDashboardPreference } from "./useDashboardPreference.js";

import type { DashboardPreference } from "../../shared/index.js";

export interface DashboardWidgetsState {
  /** 租户/权限允许当前用户看到的卡片（**含**被本人隐藏的），配置面板用这份。 */
  allowedWidgets: DashboardWidget[];
  /** 再应用用户偏好后真正渲染的卡片。 */
  widgets: DashboardWidget[];
  preference?: DashboardPreference;
  /**
   * 偏好是否已落定。工作台**要等它**再渲染栅格：偏好没回来就先按默认全渲染的话，
   * 用户隐藏掉的卡片会闪一下再消失，比多等一个请求更难受。
   * 请求失败时也算落定（`preference` 为 undefined = 回退到各模块默认布局）。
   */
  isPreferenceReady: boolean;
}

/** 当前用户在当前租户下的工作台卡片（已按权限收窄 + 应用个人布局）。 */
export function useDashboardWidgets(): DashboardWidgetsState {
  const { data: entitlements } = useTenantEntitlements();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data: preference, isPending: preferencePending } =
    useDashboardPreference();

  const allowedWidgets = useMemo(
    () =>
      // 注册表在组装层启动时写入且此后不变，可以在 memo 内读。
      selectVisibleDashboardWidgets(
        getDashboardWidgets(),
        entitlements,
        permissionsLoading ? undefined : hasPermission,
      ),
    [entitlements, hasPermission, permissionsLoading],
  );

  const widgets = useMemo(
    () => applyDashboardPreference(allowedWidgets, preference),
    [allowedWidgets, preference],
  );

  return {
    allowedWidgets,
    widgets,
    preference,
    isPreferenceReady: !preferencePending,
  };
}

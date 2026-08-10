import type { DashboardPreference } from "../../shared/index.js";
import type { DashboardWidget } from "@be-water/client-kit";
import type { Permission, TenantEntitlementsResponse } from "@be-water/shared";

export type DashboardEntitlements = Pick<
  TenantEntitlementsResponse,
  "modules" | "features"
>;

export type HasPermission = (permission: Permission) => boolean;

/** 未声明 `order` 的卡片排在显式声明的「靠前卡片」之后、「靠后卡片」之前。 */
export const DEFAULT_WIDGET_ORDER = 100;

/**
 * 可见性与侧栏导航项同口径（`apps/client/src/app-nav.ts` 的 `isNavItemVisible`）：
 *
 * - 权限维度 **fail-closed**：`hasPermission` 未传（还在加载）时先隐藏，
 *   否则卡片会先闪一下再消失，甚至发出注定 403 的请求。
 * - entitlement 维度 **fail-open**：`entitlements` 未加载时先显示，
 *   工作台是落地页，卡在 loading 上比多渲染一张卡片更糟。
 */
export function isDashboardWidgetVisible(
  widget: DashboardWidget,
  entitlements?: DashboardEntitlements,
  hasPermission?: HasPermission,
): boolean {
  if (widget.anyPermission && widget.anyPermission.length > 0) {
    if (!hasPermission) {
      return false;
    }
    if (!widget.anyPermission.some((permission) => hasPermission(permission))) {
      return false;
    }
  }

  if (!entitlements) {
    return true;
  }

  if (
    widget.tenantModule &&
    entitlements.modules[widget.tenantModule] === false
  ) {
    return false;
  }

  if (widget.tenantFeature && !entitlements.features[widget.tenantFeature]) {
    return false;
  }

  return true;
}

/**
 * 过滤 + 排序。`order` 相同的按传入顺序（即 `ENABLED_CLIENT_MODULES` 的注册顺序），
 * 依赖 `Array.prototype.sort` 的稳定性。
 *
 * 这里只做「租户/权限**允许**看到哪些卡片」；用户自己的显隐与排序偏好是下一层
 * （`applyDashboardPreference`），两者顺序不能反——用户不该能把无权访问的卡片显示出来。
 */
export function selectVisibleDashboardWidgets(
  widgets: readonly DashboardWidget[],
  entitlements?: DashboardEntitlements,
  hasPermission?: HasPermission,
): DashboardWidget[] {
  return widgets
    .filter((widget) =>
      isDashboardWidgetVisible(widget, entitlements, hasPermission),
    )
    .sort(
      (a, b) =>
        (a.order ?? DEFAULT_WIDGET_ORDER) - (b.order ?? DEFAULT_WIDGET_ORDER),
    );
}

/**
 * 按用户偏好排序：`widget_order` 里的卡片按其中次序排在最前，其余（用户排序之后
 * 才装上的模块）保持传入的默认次序、跟在后面。
 *
 * 新卡片排在末尾而不是插回默认位置：用户排过序之后，任何「自作主张插队」都会打乱
 * 他刚摆好的布局；排在末尾至少是可预期的，用户想调再拖一次。
 */
export function sortDashboardWidgetsByPreference(
  widgets: readonly DashboardWidget[],
  widgetOrder: readonly string[],
): DashboardWidget[] {
  if (widgetOrder.length === 0) {
    return [...widgets];
  }

  const rankById = new Map(widgetOrder.map((id, index) => [id, index]));
  return [...widgets].sort((a, b) => {
    const rankA = rankById.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const rankB = rankById.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return rankA - rankB;
  });
}

/**
 * 应用用户偏好：先按偏好排序，再剔除用户隐藏的卡片。
 *
 * 传入的必须是**已经过 `selectVisibleDashboardWidgets`** 的列表——偏好只在用户本就
 * 可见的卡片集合内生效。偏好里残留的已卸载模块 id 自然落空，无需清理。
 */
export function applyDashboardPreference(
  widgets: readonly DashboardWidget[],
  preference?: DashboardPreference,
): DashboardWidget[] {
  if (!preference) {
    return [...widgets];
  }

  const hidden = new Set(preference.hidden_widgets);
  return sortDashboardWidgetsByPreference(
    widgets,
    preference.widget_order,
  ).filter((widget) => !hidden.has(widget.id));
}

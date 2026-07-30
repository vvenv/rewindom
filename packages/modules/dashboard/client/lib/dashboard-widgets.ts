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

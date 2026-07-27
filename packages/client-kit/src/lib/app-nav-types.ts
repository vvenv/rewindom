import type { Permission, TenantFeatureKey } from "@be-water/shared";
import type { LucideIcon } from "lucide-react";

export interface AppNavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  title?: string;
  keywords?: string;
  mobileLabel?: string;
  end?: boolean;
  badgeKey?: "tasks";
  activePrefix?: string;
  tenantModule?: string;
  tenantFeature?: TenantFeatureKey;
  /**
   * 命中任一权限才显示。用于管理类入口（用户、角色）——这些页面挂在
   * `SuperUserRoute` 下，无权限者点进去只会被弹回首页，因此导航必须同步隐藏。
   *
   * 与 `tenantModule` / `tenantFeature` 的区别：那两者是**租户**买没买该能力，
   * 这里是**当前用户**在租户内有没有该权限。两个维度独立，可叠加。
   */
  anyPermission?: readonly Permission[];
}

export interface AppNavSection {
  label: string;
  items: AppNavItem[];
}

export interface MobileTabItem {
  icon: LucideIcon;
  label: string;
  path: string;
  end?: boolean;
  badgeKey?: AppNavItem["badgeKey"];
  activePrefix?: string;
}

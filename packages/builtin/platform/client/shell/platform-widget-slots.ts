import { createComponentSlot } from "@rewindom/client-kit";

/**
 * Platform-console widget slots (owned by module-platform views).
 * Providing modules register via shellProviders; consumers use `.useSlot()`.
 */

/** notification: activity/notification center in the platform header. */
export const activityCenterSlot = createComponentSlot("ActivityCenterSlot");

/** user: avatar + user menu in the platform header. */
export const userAvatarSlot = createComponentSlot("UserAvatarSlot");

/** user: role badge cell in the platform users table. */
export const userRoleBadgeSlot = createComponentSlot<{ isSystemAdmin: boolean }>(
  "UserRoleBadgeSlot",
);

/**
 * 业务模块向平台租户卡片追加的操作入口。
 *
 * 提供方注册**一个**组件，在其中自行渲染任意多个 Sheet/按钮——上游不为每个
 * 业务入口开一个具名槽，否则每加一个下游功能都要改 `platform` 模块。
 */
export const tenantCardActionsSlot = createComponentSlot<{
  tenant: { id: string; name: string };
  disabled?: boolean;
}>("TenantCardActionsSlot");

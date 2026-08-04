import type { TenantModuleEntitlement } from "@be-water/shared";

export const TODO_ENTITLEMENT: TenantModuleEntitlement = {
  key: "todos",
  label: "待办",
  description: "租户内待办事项管理",
  disabled_hint: "该组织未开通待办模块",
  default_enabled: true,
};

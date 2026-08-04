import type { TenantModuleEntitlement } from "@be-water/shared";

export const NOTES_ENTITLEMENT: TenantModuleEntitlement = {
  key: "notes",
  label: "笔记",
  description: "租户内笔记管理（示例模块）",
  disabled_hint: "该组织未开通笔记模块",
  default_enabled: true,
};

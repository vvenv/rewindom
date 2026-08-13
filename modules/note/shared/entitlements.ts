import type { TenantModuleEntitlement } from "@rewindom/module-sdk";

export const NOTE_ENTITLEMENT: TenantModuleEntitlement = {
  key: "note",
  label: "笔记",
  description: "租户内笔记管理",
  disabled_hint: "该组织未开通笔记模块",
  default_enabled: true,
};

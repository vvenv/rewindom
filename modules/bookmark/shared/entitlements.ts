import type { TenantModuleEntitlement } from "@rewindom/module-sdk";

export const BOOKMARK_ENTITLEMENT: TenantModuleEntitlement = {
  key: "bookmark",
  label: "书签",
  description: "租户内书签管理",
  disabled_hint: "该组织未开通书签模块",
  default_enabled: true,
};

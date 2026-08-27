import type { TenantModuleEntitlement } from "@rewindom/module-sdk";

export const THING_ENTITLEMENT: TenantModuleEntitlement = {
  key: "useless",
  label: "无用",
  description: "无用句子库",
  disabled_hint: "该站点未开通无用模块",
  default_enabled: false,
};

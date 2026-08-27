import type { TenantModuleEntitlement } from "@rewindom/module-sdk";

export const THING_ENTITLEMENT: TenantModuleEntitlement = {
  key: "useless",
  label: "无用",
  description: "无用句子库",
  disabled_hint: "该站点未开通无用模块",
  default_enabled: false,
};

/** 编辑器「添加区块」分组。无用的段共用这一 key。 */
export const USELESS_SECTION_GROUP = "useless:section.group";

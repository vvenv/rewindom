import type { TenantModuleEntitlement } from "@rewindom/shared";

export const BILLING_ENTITLEMENT: TenantModuleEntitlement = {
  key: "billing",
  label: "订阅与付款",
  description: "租户自助管理订阅与付款",
  disabled_hint: "该组织未开通订阅与付款模块",
  default_enabled: true,
};

/** 编辑器「添加区块」分组。平台套餐段用这一 key，与站点会员套餐分开。 */
export const BILLING_SECTION_GROUP = "billing:section.group";

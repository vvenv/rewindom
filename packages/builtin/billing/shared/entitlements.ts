import type { TenantModuleEntitlement } from "@be-water/shared";

export const BILLING_ENTITLEMENT: TenantModuleEntitlement = {
  key: "billing",
  label: "订阅与付款",
  description: "租户自助管理订阅与付款",
  disabled_hint: "该组织未开通订阅与付款模块",
  default_enabled: true,
};

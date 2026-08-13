import type { TenantModuleEntitlement } from "@rewindom/shared";

export const SITE_BILLING_ENTITLEMENT: TenantModuleEntitlement = {
  key: "site-billing",
  label: "会员付费",
  description: "站点会员套餐、订阅与付款",
  disabled_hint: "该站点未开通会员付费",
  default_enabled: true,
};

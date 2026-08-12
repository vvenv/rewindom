import type { TenantModuleEntitlement } from "@be-water/shared";

/**
 * 会员付费默认关闭 —— 比会员体系本身还要保守一档。
 *
 * 开了它等于在公开面上多一个收款入口，而收款要先配通道商品、要有退款口径、
 * 要对得上账。这不该是「建站之后不知不觉就带上了」的东西。
 *
 * key 是租户设置里的持久化标识，改动会令存量开关失效。
 */
export const TENANT_SITE_BILLING_ENTITLEMENT: TenantModuleEntitlement = {
  key: "tenant-site-billing",
  label: "会员付费",
  description: "站点会员的订阅套餐、结账与付款记录",
  disabled_hint: "该站点未开通会员付费",
  default_enabled: false,
};

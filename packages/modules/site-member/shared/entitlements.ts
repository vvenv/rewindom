import type { TenantModuleEntitlement } from "@be-water/shared";

/**
 * 会员体系默认关闭：多数站点只做公开官网，开了等于凭空多一个对外注册入口。
 * key 是租户设置里的持久化标识，改动会令存量开关失效。
 */
export const TENANT_SITE_MEMBER_ENTITLEMENT: TenantModuleEntitlement = {
  key: "tenant-site-member",
  label: "站点会员",
  description: "站点前台的注册登录与会员专属内容",
  disabled_hint: "该站点未开通会员功能",
  default_enabled: false,
};

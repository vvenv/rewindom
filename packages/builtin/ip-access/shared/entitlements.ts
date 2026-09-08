import type { TenantModuleEntitlement } from "@rewindom/shared";

/**
 * 只管「站点能不能自己维护访问名单」。
 *
 * 平台全局名单属于基础设施，永远在线，不受本开关影响——否则关掉一个租户的开关
 * 就能让它绕过平台级封禁。
 */
export const IP_ACCESS_ENTITLEMENT: TenantModuleEntitlement = {
  key: "ip-access",
  label: "访问控制",
  description: "按 IP / IP 段限制谁能访问本站点",
  disabled_hint: "该组织未开通访问控制",
  default_enabled: false,
};

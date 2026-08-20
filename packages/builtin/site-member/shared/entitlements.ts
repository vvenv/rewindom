import type { TenantModuleEntitlement } from "@rewindom/shared";

/**
 * 站点会员这块功能的租户开关。
 *
 * 关掉 = 这个站点不做会员：中台不再有会员管理与会员版式，公开面的注册 / 登录 / 账户
 * 接口与页面一律不可用。会员数据不动——重新打开就还在。
 *
 * **默认开**：会员是站点的基础能力之一，存量站点不该因为多了这个开关就掉线。开关的
 * 意义在另一头——关掉它，中台就清静了；由关变开的那一刻，marketing 会把三张会员版式
 * 落库（见 `member-page-templates.ts` 的 `auto_init`）。
 */
export const SITE_MEMBER_ENTITLEMENT: TenantModuleEntitlement = {
  key: "site-member",
  label: "站点会员",
  description: "站点前台的会员注册、登录与账户",
  disabled_hint: "该站点未开通会员功能",
  default_enabled: true,
};

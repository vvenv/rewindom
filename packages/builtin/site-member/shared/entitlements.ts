import type { TenantModuleEntitlement } from "@rewindom/shared";

/**
 * 站点会员这块功能的租户开关。
 *
 * 关掉 = 这个站点不做会员：中台不再有会员管理与会员版式，公开面的注册 / 登录 / 账户
 * 接口与页面一律不可用。会员数据不动——重新打开就还在。
 *
 * **默认关**：会员不是站点跑起来的必须能力（一份宣传页不需要注册登录）。
 * 存量站点若从未写入开关、一直靠旧默认 true 开通，由
 * `backfill-tenant-module-legacy-defaults.ts` 写成显式 true，不会掉线。
 * 由关变开的那一刻，marketing 会把三张会员版式落库（见 `member-page-templates.ts`
 * 的 `auto_init`）。
 */
export const SITE_MEMBER_ENTITLEMENT: TenantModuleEntitlement = {
  key: "site-member",
  label: "站点会员",
  description: "站点前台的会员注册、登录与账户",
  disabled_hint: "该站点未开通会员功能",
  default_enabled: false,
};

/**
 * 编辑器「添加区块」分组。所有 `/member/*` 相关段共用这一 key——登录 / 注册 /
 * 账户由本模块登记，套餐与账单由 site-billing 复用。分组身份是 key，不是各写一份
 * 碰巧同名的文案。
 */
export const SITE_MEMBER_SECTION_GROUP = "site-member:section.group";

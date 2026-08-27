import type { TenantModuleEntitlement } from "@rewindom/module-sdk";

/**
 * 默认关：表单不是站点跑起来的必须能力。存量站点若从未写入开关、一直靠旧默认
 * true 开通，由 `backfill-tenant-module-legacy-defaults.ts` 写成显式 true。
 */
export const SITE_FORM_ENTITLEMENT: TenantModuleEntitlement = {
  key: "site-form",
  label: "站点表单",
  description: "官网表单段与提交记录",
  disabled_hint: "该站点未开通表单",
  default_enabled: false,
};

/** 编辑器「添加区块」分组。 */
export const SITE_FORM_SECTION_GROUP = "site-form:section.group";

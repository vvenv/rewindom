import type { TenantModuleEntitlement } from "@rewindom/module-sdk";

/**
 * 默认开：拆分前表单是内置段，所有站点都能用。默认关会让升级当天存量表单从
 * 已发布的页面上消失——那不是「新功能待开通」，是内容凭空少了一块。
 */
export const SITE_FORM_ENTITLEMENT: TenantModuleEntitlement = {
  key: "site-form",
  label: "站点表单",
  description: "官网表单段与提交记录",
  disabled_hint: "该站点未开通表单",
  default_enabled: true,
};

import type { TenantModuleEntitlement } from "@be-water/shared";

/** 租户自助 Marketing CMS（含产品主域默认租户站）。 */
export const TENANT_MARKETING_ENTITLEMENT: TenantModuleEntitlement = {
  key: "tenant-marketing",
  label: "官网",
  description: "自助编辑站点内容（section 编排 + 主题；主域为默认组织站点）",
  disabled_hint: "该组织未开通官网",
  default_enabled: true,
};

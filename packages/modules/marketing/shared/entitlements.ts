import type { TenantModuleEntitlement } from "@be-water/shared";

/** 租户自助 Marketing CMS（与平台静态官网分离）。 */
export const TENANT_MARKETING_ENTITLEMENT: TenantModuleEntitlement = {
  key: "tenant-marketing",
  label: "租户官网",
  description: "租户自助编辑绑定域名上的官网内容（Markdown 页面 + 站点品牌）",
  disabled_hint: "该租户未开通租户官网",
  default_enabled: true,
};

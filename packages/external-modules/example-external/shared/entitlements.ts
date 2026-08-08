import type { TenantModuleEntitlement } from "@be-water/module-sdk";

export const EXAMPLE_EXTERNAL_ENTITLEMENT: TenantModuleEntitlement = {
  key: "example-external",
  label: "外部书签（示例）",
  description: "外部模块示例：租户内书签管理",
  disabled_hint: "该组织未开通外部书签示例模块",
  default_enabled: true,
};

import type { TenantModuleEntitlement } from "@rewindom/module-sdk";

export const SITE_DOCS_ENTITLEMENT: TenantModuleEntitlement = {
  key: "site-docs",
  label: "文档库",
  description: "站点文档库：Markdown 文档、分类与公开 /docs",
  disabled_hint: "该站点未开通文档库",
  default_enabled: false,
};

/** 编辑器「添加区块」分组。文档段共用这一 key。 */
export const SITE_DOCS_SECTION_GROUP = "site-docs:section.group";

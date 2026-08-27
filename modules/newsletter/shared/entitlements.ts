import type { TenantModuleEntitlement } from "@rewindom/module-sdk";

export const NEWSLETTER_ENTITLEMENT: TenantModuleEntitlement = {
  key: "newsletter",
  label: "邮件订阅",
  description: "访客留邮箱订阅站点内容，按周期收摘要",
  disabled_hint: "该站点未开通邮件订阅",
  /*
   * 默认关。订阅是对外收集邮箱的入口，站长该自己决定开不开（还牵扯隐私政策）。
   */
  default_enabled: false,
};

/** 编辑器「添加区块」分组。邮件订阅段共用这一 key。 */
export const NEWSLETTER_SECTION_GROUP = "newsletter:section.group";

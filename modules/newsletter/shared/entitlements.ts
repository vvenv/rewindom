import type { TenantModuleEntitlement } from "@rewindom/module-sdk";

export const NEWSLETTER_ENTITLEMENT: TenantModuleEntitlement = {
  key: "newsletter",
  label: "邮件订阅",
  description: "访客留邮箱订阅站点内容，按周期收摘要",
  disabled_hint: "该站点未开通邮件订阅",
  /*
   * 与 site-form 相反，这里默认**关**：site-form 是拆分前就在用的存量能力，
   * 而订阅是全新的对外入口。默认开会让所有存量站点在升级当天多出一个收集邮箱的
   * 表单，那是站长该自己决定的事（还牵扯隐私政策）。
   */
  default_enabled: false,
};

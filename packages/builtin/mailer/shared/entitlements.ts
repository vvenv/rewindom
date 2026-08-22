import type { TenantModuleEntitlement } from "@rewindom/shared";

export const MAILER_ENTITLEMENT: TenantModuleEntitlement = {
  key: "mailer",
  label: "邮件发送",
  description: "配置本站发信通道，查看投递记录",
  disabled_hint: "该组织未开通邮件发送",
  /*
   * 默认开。关掉的语义是「这个租户一封信都不发」——registry 对它返回 null，
   * 依赖发信的模块（newsletter 的订阅入口、将来 site-member 的邮箱验证）
   * 随之把入口收起来，而不是收下请求再无声地发不出去。
   */
  default_enabled: true,
};

/**
 * Typed domain event catalog for EventBus.
 * Add new events here when introducing cross-module side effects.
 */
import type { AppLocale } from "@rewindom/shared";
/**
 * 审计详情：`detail_key` + `detail_params`（可按查看者语言渲染）；
 * 落库时另写一份 zh-CN 到 `details` 供检索。
 */
export interface AuditDetailParams {
  [key: string]: string | number | boolean | null | undefined;
}

export interface AuditLogEventPayload {
  userId?: string;
  username: string;
  tenant_slug?: string | null;
  scope?: string;
  action: string;
  resource?: string;
  /** 稳定模板 code，如 `notes.audit.created` */
  detail_key?: string;
  detail_params?: AuditDetailParams;
  ipAddress?: string;
  userAgent?: string;
}

export interface NotificationCreateEventPayload {
  tenant_id: string;
  user_id: string;
  type: string;
  severity: string;
  title: string;
  body: string;
  link_path?: string;
  metadata?: Record<string, unknown>;
  dedupe_key?: string;
}

/** 新租户创建完成（事务提交后）。订阅方拿它做租户级初始化（如官网默认页面）。 */
export interface TenantCreatedEventPayload {
  tenant_id: string;
  /** 平台默认语言（发布方解析好，订阅方不用反查平台设置）。 */
  default_locale: AppLocale;
}

/**
 * 租户能力开关写完（事务提交后）。
 *
 * 订阅方拿它补建「刚才才变得相关」的资源——比如官网模板页：没开通商店时不该预建
 * `/shop` 版式，打开开关的这一刻才快照。
 */
export interface TenantEntitlementsUpdatedEventPayload {
  tenant_id: string;
  /**
   * 这一次**由关变开**的开关 key（模块 entitlement 与套餐 feature flag 合在一起）。
   *
   * 只报增量，不报全量：有些资源要的是「安装这项功能的那一刻」而不是「这项功能开着」
   * ——官网的首页 / 会员版式平时不预建，开关翻上来才落库。全量集合区分不出这两者，
   * 保存一次开关就会把它们统统建出来。
   */
  enabled_keys: string[];
}

/**
 * 一封信被收件方退回 / 被用户举报。由 `mailer` 的投递回调发布。
 *
 * mailer 只落数据 + 广播，**不做业务决定**：「这个地址以后还发不发」是调用方的事
 * ——newsletter 要停发，将来 site-member 的验证信可能只想提示用户换个邮箱。
 *
 * `hard` / `soft` 必须分开：soft（邮箱满了）过几天可能就好了，一次就永久停发
 * 等于因为对方邮箱满了一天而丢掉一个真实读者。
 */
export interface MailBouncedEventPayload {
  tenant_id: string;
  email: string;
  bounce_type: "hard" | "soft";
  delivery_id: string;
  reason?: string;
}

/**
 * 用户点了「举报垃圾邮件」。
 *
 * 与退信是两回事：退信是**地址**问题，投诉是**内容或频率**问题。把投诉当退信处理，
 * 等于把「你发太多了」误读成「这个地址不存在」，改错方向。
 */
export interface MailComplainedEventPayload {
  tenant_id: string;
  email: string;
  delivery_id: string;
}

/**
 * 收件方确认送达。
 *
 * 只有支持投递回调的通道会有——SMTP 是「交出去就结束」，永远不会发这个事件。
 * 订阅方拿它清软退信计数：「连续 N 次退信」里的**连续**就靠这一步，
 * 不清零的话一个订阅者三年里零散退信三次也会被停发，而他其实一直收得到。
 */
export interface MailDeliveredEventPayload {
  tenant_id: string;
  email: string;
  delivery_id: string;
}

export interface DomainEventMap {
  "audit.log": AuditLogEventPayload;
  "notification.create": NotificationCreateEventPayload;
  "tenant.created": TenantCreatedEventPayload;
  "tenant.entitlements.updated": TenantEntitlementsUpdatedEventPayload;
  "mail.bounced": MailBouncedEventPayload;
  "mail.complained": MailComplainedEventPayload;
  "mail.delivered": MailDeliveredEventPayload;
}

export type DomainEventName = keyof DomainEventMap & string;

export type DomainEventPayload<K extends DomainEventName> = DomainEventMap[K];

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

export interface DomainEventMap {
  "audit.log": AuditLogEventPayload;
  "notification.create": NotificationCreateEventPayload;
  "tenant.created": TenantCreatedEventPayload;
}

export type DomainEventName = keyof DomainEventMap & string;

export type DomainEventPayload<K extends DomainEventName> = DomainEventMap[K];

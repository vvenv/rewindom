/**
 * Typed domain event catalog for EventBus.
 * Add new events here when introducing cross-module side effects.
 */
/**
 * 审计详情：优先 `detail_key` + `detail_params`（可按查看者语言渲染）；
 * `details` 仅作遗留纯文本或落库时的 zh-CN 检索副本。
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
  /** @deprecated 新写入请用 detail_key + detail_params */
  details?: string;
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

export interface DomainEventMap {
  "audit.log": AuditLogEventPayload;
  "notification.create": NotificationCreateEventPayload;
}

export type DomainEventName = keyof DomainEventMap & string;

export type DomainEventPayload<K extends DomainEventName> = DomainEventMap[K];

/**
 * Typed domain event catalog for EventBus.
 * Add new events here when introducing cross-module side effects.
 */
export interface AuditLogEventPayload {
  userId?: string;
  username: string;
  tenant_slug?: string | null;
  scope?: string;
  action: string;
  resource?: string;
  details?: string;
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

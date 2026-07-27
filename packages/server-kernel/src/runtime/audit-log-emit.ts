import type { AuditLogEventPayload } from "./domain-events.js";
import type { EventBus } from "./event-bus.js";
import type { FastifyBaseLogger, FastifyRequest } from "fastify";

let boundEventBus: EventBus | null = null;

/** Called once at bootstrap when `app.events` is attached. */
export function bindAuditEventBus(events: EventBus): void {
  boundEventBus = events;
}

export function getAuditEventBus(): EventBus | null {
  return boundEventBus;
}

export type AuditLogEmitInput = Omit<
  AuditLogEventPayload,
  "ipAddress" | "userAgent" | "tenant_slug"
> & {
  tenant_slug?: string | null;
  ipAddress?: string;
  userAgent?: string;
};

export async function emitAuditLog(
  events: EventBus,
  payload: AuditLogEventPayload,
): Promise<void> {
  await events.emit("audit.log", payload);
}

export async function emitAuditLogFromRequest(
  events: EventBus,
  request: Pick<FastifyRequest, "tenantContext" | "ip" | "headers">,
  input: AuditLogEmitInput,
): Promise<void> {
  const userAgent = request.headers["user-agent"];
  await emitAuditLog(events, {
    ...input,
    tenant_slug: input.tenant_slug ?? request.tenantContext?.tenant_slug ?? null,
    ipAddress: input.ipAddress ?? request.ip,
    userAgent:
      input.userAgent ??
      (typeof userAgent === "string" ? userAgent : undefined),
  });
}

export async function emitAuditLogSafe(
  events: EventBus | null | undefined,
  log: FastifyBaseLogger,
  payload: AuditLogEventPayload,
): Promise<void> {
  if (!events) {
    return;
  }
  try {
    await emitAuditLog(events, payload);
  } catch (error) {
    log.error({ error }, "Failed to log audit entry");
  }
}

export async function emitAuditLogFromRequestSafe(
  events: EventBus | null | undefined,
  log: FastifyBaseLogger,
  request: Pick<FastifyRequest, "tenantContext" | "ip" | "headers">,
  input: AuditLogEmitInput,
): Promise<void> {
  if (!events) {
    return;
  }
  try {
    await emitAuditLogFromRequest(events, request, input);
  } catch (error) {
    log.error({ error }, "Failed to log audit entry");
  }
}

/** For background jobs / services without a Fastify request. */
export async function emitDetachedAuditLogSafe(
  log: FastifyBaseLogger | undefined,
  payload: AuditLogEventPayload,
): Promise<void> {
  const events = getAuditEventBus();
  if (!events) {
    return;
  }
  try {
    await emitAuditLog(events, payload);
  } catch (error) {
    log?.error({ error }, "Failed to log audit entry");
  }
}

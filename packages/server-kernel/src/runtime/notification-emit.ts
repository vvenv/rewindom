import type { NotificationCreateEventPayload } from "./domain-events.js";
import type { EventBus } from "./event-bus.js";
import type { FastifyBaseLogger } from "fastify";

let boundEventBus: EventBus | null = null;

export function bindNotificationEventBus(events: EventBus): void {
  boundEventBus = events;
}

export function getNotificationEventBus(): EventBus | null {
  return boundEventBus;
}

export async function emitNotificationCreate(
  events: EventBus,
  payload: NotificationCreateEventPayload,
): Promise<void> {
  await events.emit("notification.create", payload);
}

export async function emitNotificationCreateSafe(
  events: EventBus | null | undefined,
  payload: NotificationCreateEventPayload,
): Promise<void> {
  if (!events) {
    return;
  }
  try {
    await emitNotificationCreate(events, payload);
  } catch {
    // Notification handlers must not block the publisher.
  }
}

/** For services without a Fastify request (uses bootstrap-bound bus). */
export async function emitDetachedNotificationCreateSafe(
  log: FastifyBaseLogger | undefined,
  payload: NotificationCreateEventPayload,
): Promise<void> {
  const events = getNotificationEventBus();
  if (!events) {
    return;
  }
  try {
    await emitNotificationCreate(events, payload);
  } catch (error) {
    log?.error({ error }, "Failed to emit notification.create");
  }
}

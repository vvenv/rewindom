import type { DomainEventName, DomainEventPayload } from "./domain-events.js";
import type { EventBus } from "./event-bus.js";
import type { FastifyBaseLogger } from "fastify";

let boundEventBus: EventBus | null = null;

/** Called once at bootstrap when `app.events` is attached. */
export function bindDomainEventBus(events: EventBus): void {
  boundEventBus = events;
}

export function getDomainEventBus(): EventBus | null {
  return boundEventBus;
}

/**
 * 事务外的 service（没有 Fastify request / app 句柄）发领域事件用。
 *
 * 失败只记日志：领域事件是「已发生事实」的广播，订阅方挂掉不该让发布方的主流程
 * （如建租户）回滚或报错。
 */
export async function emitDetachedDomainEventSafe<K extends DomainEventName>(
  log: FastifyBaseLogger | undefined,
  event: K,
  payload: DomainEventPayload<K>,
): Promise<void> {
  const events = getDomainEventBus();
  if (!events) {
    return;
  }
  try {
    await events.emit(event, payload);
  } catch (error) {
    log?.error({ error, event }, "Failed to emit domain event");
  }
}

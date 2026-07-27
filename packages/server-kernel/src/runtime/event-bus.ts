import type { DomainEventName, DomainEventPayload } from "./domain-events.js";

export type DomainEventHandler<T = unknown> = (
  payload: T,
) => void | Promise<void>;

/** `app.events` — 由 apps/server 在装载模块后 decorate。 */
declare module "fastify" {
  interface FastifyInstance {
    events: EventBus;
  }
}

export class EventBus {
  private handlers = new Map<string, Set<DomainEventHandler>>();

  on<K extends DomainEventName>(
    event: K,
    handler: DomainEventHandler<DomainEventPayload<K>>,
  ): () => void {
    return this.onLoose(event, handler);
  }

  /** Untyped subscription for events not yet in DomainEventMap. */
  onLoose<T>(event: string, handler: DomainEventHandler<T>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as DomainEventHandler);

    return () => {
      set!.delete(handler as DomainEventHandler);
    };
  }

  async emit<K extends DomainEventName>(
    event: K,
    payload: DomainEventPayload<K>,
  ): Promise<void> {
    await this.emitLoose(event, payload);
  }

  /** Untyped publish for events not yet in DomainEventMap. */
  async emitLoose<T>(event: string, payload: T): Promise<void> {
    const set = this.handlers.get(event);
    if (!set || set.size === 0) {
      return;
    }

    for (const handler of set) {
      try {
        await handler(payload);
      } catch {
        // Event handlers must not block the publisher; log at call site if needed.
      }
    }
  }
}

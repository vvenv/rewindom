import { afterEach, describe, expect, it, vi } from "vitest";

import {
  drainOutboxOnce,
  registerOutboxHandler,
  resetOutboxHandlers,
  type ClaimedOutboxMessage,
  type OutboxStore,
} from "./outbox.dispatcher.js";

function message(
  overrides: Partial<ClaimedOutboxMessage> = {},
): ClaimedOutboxMessage {
  return {
    id: "m1",
    topic: "audit.log",
    payload: { action: "NOTE_CREATE" },
    tenant_id: null,
    attempts: 1,
    ...overrides,
  };
}

function buildStore(claimed: ClaimedOutboxMessage[]): OutboxStore & {
  fail: ReturnType<typeof vi.fn>;
  complete: ReturnType<typeof vi.fn>;
  releaseUnhandled: ReturnType<typeof vi.fn>;
} {
  return {
    recoverStuck: vi.fn(async () => 0),
    claim: vi.fn(async () => claimed),
    complete: vi.fn(async () => undefined),
    fail: vi.fn(async () => "pending" as const),
    releaseUnhandled: vi.fn(async () => undefined),
  } as never;
}

afterEach(() => {
  resetOutboxHandlers();
});

describe("registerOutboxHandler", () => {
  it("keeps the first registration for a topic", async () => {
    const first = vi.fn(async () => undefined);
    const second = vi.fn(async () => undefined);
    registerOutboxHandler("audit.log", first);
    registerOutboxHandler("audit.log", second);

    const store = buildStore([message()]);
    await drainOutboxOnce({ store });

    expect(first).toHaveBeenCalledOnce();
    expect(second).not.toHaveBeenCalled();
  });
});

describe("drainOutboxOnce", () => {
  it("deletes the row after a successful redelivery", async () => {
    registerOutboxHandler("audit.log", async () => undefined);
    const store = buildStore([message()]);

    const result = await drainOutboxOnce({ store });

    expect(store.complete).toHaveBeenCalledWith("m1");
    expect(result).toMatchObject({ claimed: 1, completed: 1, dead: 0 });
  });

  it("re-queues with backoff when the handler throws", async () => {
    registerOutboxHandler("audit.log", async () => {
      throw new Error("db down");
    });
    const store = buildStore([message()]);

    const result = await drainOutboxOnce({ store });

    expect(store.complete).not.toHaveBeenCalled();
    expect(store.fail).toHaveBeenCalledWith(
      expect.objectContaining({ id: "m1" }),
      "db down",
      expect.any(Date),
    );
    expect(result).toMatchObject({ retried: 1, dead: 0 });
  });

  it("counts a dead letter when the store reports the ladder is exhausted", async () => {
    registerOutboxHandler("audit.log", async () => {
      throw new Error("still down");
    });
    const store = buildStore([message({ attempts: 5 })]);
    store.fail.mockResolvedValue("dead");
    const log = { warn: vi.fn(), error: vi.fn() };

    const result = await drainOutboxOnce({ store, log });

    expect(result).toMatchObject({ dead: 1, retried: 0 });
    expect(log.error).toHaveBeenCalled();
  });

  it("releases unhandled topics without burning an attempt", async () => {
    const store = buildStore([message({ topic: "notification.create" })]);
    const log = { warn: vi.fn(), error: vi.fn() };

    const result = await drainOutboxOnce({ store, log });

    expect(store.releaseUnhandled).toHaveBeenCalledOnce();
    expect(store.fail).not.toHaveBeenCalled();
    expect(result).toMatchObject({ unhandled: 1, completed: 0 });
    expect(log.warn).toHaveBeenCalled();
  });

  it("keeps draining the batch after one message fails", async () => {
    const handled: string[] = [];
    registerOutboxHandler("audit.log", async (payload) => {
      const id = (payload as { id: string }).id;
      if (id === "bad") {
        throw new Error("boom");
      }
      handled.push(id);
    });
    const store = buildStore([
      message({ id: "m1", payload: { id: "bad" } }),
      message({ id: "m2", payload: { id: "good" } }),
    ]);

    const result = await drainOutboxOnce({ store });

    expect(handled).toEqual(["good"]);
    expect(result).toMatchObject({ claimed: 2, completed: 1, retried: 1 });
  });

  it("recovers stuck rows before claiming", async () => {
    const store = buildStore([]);
    store.recoverStuck = vi.fn(async () => 3);

    const result = await drainOutboxOnce({ store });

    expect(store.recoverStuck).toHaveBeenCalled();
    expect(result.recovered).toBe(3);
  });
});

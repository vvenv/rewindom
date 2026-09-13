import { describe, expect, it } from "vitest";

import {
  OUTBOX_BACKOFF_MS,
  OUTBOX_MAX_ATTEMPTS,
  OUTBOX_STUCK_MS,
  hasAttemptsLeft,
  isStuck,
  nextAttemptAt,
  nextAttemptDelayMs,
} from "./outbox.js";

describe("nextAttemptDelayMs", () => {
  it("walks the ladder by attempt count", () => {
    expect(nextAttemptDelayMs(1)).toBe(60_000);
    expect(nextAttemptDelayMs(2)).toBe(5 * 60_000);
    expect(nextAttemptDelayMs(5)).toBe(6 * 60 * 60_000);
  });

  it("clamps out-of-range counts instead of returning undefined", () => {
    // 0 / 负数只可能来自调用方算错；返回首档比 NaN 好排查
    expect(nextAttemptDelayMs(0)).toBe(OUTBOX_BACKOFF_MS[0]);
    expect(nextAttemptDelayMs(-3)).toBe(OUTBOX_BACKOFF_MS[0]);
    expect(nextAttemptDelayMs(99)).toBe(
      OUTBOX_BACKOFF_MS[OUTBOX_BACKOFF_MS.length - 1],
    );
  });
});

describe("hasAttemptsLeft", () => {
  it("gives up once the ladder is exhausted", () => {
    expect(hasAttemptsLeft(OUTBOX_MAX_ATTEMPTS - 1)).toBe(true);
    expect(hasAttemptsLeft(OUTBOX_MAX_ATTEMPTS)).toBe(false);
    expect(hasAttemptsLeft(OUTBOX_MAX_ATTEMPTS + 1)).toBe(false);
  });
});

describe("nextAttemptAt", () => {
  it("offsets from the supplied clock", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(nextAttemptAt(1, now).toISOString()).toBe(
      "2026-01-01T00:01:00.000Z",
    );
  });
});

describe("isStuck", () => {
  const now = new Date("2026-01-01T00:10:00.000Z");

  it("treats an unlocked row as not stuck", () => {
    expect(isStuck(null, now)).toBe(false);
  });

  it("reclaims only after the timeout has fully elapsed", () => {
    const justUnder = new Date(now.getTime() - OUTBOX_STUCK_MS + 1);
    const exactly = new Date(now.getTime() - OUTBOX_STUCK_MS);

    expect(isStuck(justUnder, now)).toBe(false);
    expect(isStuck(exactly, now)).toBe(true);
  });
});

import { describe, it, expect, afterEach, vi } from "vitest";

import { getMsUntilLocalTime } from "./schedule-time.js";

describe("getMsUntilLocalTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the delay until later today when the time has not passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 13, 1, 0, 0));

    expect(getMsUntilLocalTime(3, 0)).toBe(2 * 60 * 60 * 1000);
  });

  it("rolls over to tomorrow when the time already passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 13, 12, 0, 0));

    expect(getMsUntilLocalTime(3, 0)).toBe(15 * 60 * 60 * 1000);
  });
});

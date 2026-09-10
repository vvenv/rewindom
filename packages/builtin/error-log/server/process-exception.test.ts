import { describe, expect, it, vi } from "vitest";

import {
  createLogDebouncer,
  processExceptionFingerprint,
  reasonToError,
} from "./process-exception.js";

describe("reasonToError", () => {
  it("returns Error instances as-is", () => {
    const error = new Error("boom");
    expect(reasonToError(error)).toBe(error);
  });

  it("wraps strings and other values", () => {
    expect(reasonToError("nope").message).toBe("nope");
    expect(reasonToError(42).message).toBe("42");
  });
});

describe("createLogDebouncer", () => {
  it("allows the first event and suppresses repeats in the window", () => {
    const debounce = createLogDebouncer(60_000);
    expect(debounce.take("a")).toEqual({ skip: false, suppressed: 0 });
    expect(debounce.take("a")).toEqual({ skip: true, suppressed: 1 });
    expect(debounce.take("a")).toEqual({ skip: true, suppressed: 2 });
    expect(debounce.take("b")).toEqual({ skip: false, suppressed: 0 });
  });

  it("carries the suppressed count onto the next allowed write", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    try {
      const debounce = createLogDebouncer(1_000);
      expect(debounce.take("a")).toEqual({ skip: false, suppressed: 0 });
      expect(debounce.take("a")).toEqual({ skip: true, suppressed: 1 });
      expect(debounce.take("a")).toEqual({ skip: true, suppressed: 2 });
      vi.setSystemTime(1_000);
      expect(debounce.take("a")).toEqual({ skip: false, suppressed: 2 });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("processExceptionFingerprint", () => {
  it("keys by kind and message", () => {
    expect(
      processExceptionFingerprint("unhandledRejection", new Error("x")),
    ).toBe("unhandledRejection:x");
  });
});

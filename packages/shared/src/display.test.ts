import { describe, it, expect } from "vitest";

import { EMPTY_DISPLAY, displayOrEmpty, formatDuration } from "./display.js";

describe("display", () => {
  describe("displayOrEmpty", () => {
    it("returns trimmed non-empty strings", () => {
      expect(displayOrEmpty("foo")).toBe("foo");
      expect(displayOrEmpty("  bar  ")).toBe("bar");
    });

    it("returns EMPTY_DISPLAY for null, undefined, empty, or whitespace", () => {
      expect(displayOrEmpty(null)).toBe(EMPTY_DISPLAY);
      expect(displayOrEmpty(undefined)).toBe(EMPTY_DISPLAY);
      expect(displayOrEmpty("")).toBe(EMPTY_DISPLAY);
      expect(displayOrEmpty("   ")).toBe(EMPTY_DISPLAY);
    });
  });

  describe("formatDuration", () => {
    it("returns milliseconds for durations < 1000ms", () => {
      expect(formatDuration(0)).toBe("0ms");
      expect(formatDuration(500)).toBe("500ms");
      expect(formatDuration(999)).toBe("999ms");
    });

    it("returns seconds for durations < 60s", () => {
      expect(formatDuration(1000)).toBe("1.0s");
      expect(formatDuration(1500)).toBe("1.5s");
      expect(formatDuration(59999)).toBe("60.0s");
    });

    it("returns minutes and seconds for durations >= 60s", () => {
      expect(formatDuration(60000)).toBe("1m 0s");
      expect(formatDuration(90000)).toBe("1m 30s");
      expect(formatDuration(125000)).toBe("2m 5s");
      expect(formatDuration(3661000)).toBe("61m 1s");
    });
  });
});

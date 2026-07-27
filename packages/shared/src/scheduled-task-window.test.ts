import { describe, expect, it } from "vitest";

import {
  clampScheduledWindowHour,
  isWithinScheduledTaskWindow,
  SCHEDULED_TASK_WINDOW_END_HOUR,
  SCHEDULED_TASK_WINDOW_START_HOUR,
} from "./scheduled-task-window.js";

describe("scheduled-task-window", () => {
  it("应该定义 08:00–13:59 允许窗口", () => {
    expect(SCHEDULED_TASK_WINDOW_START_HOUR).toBe(8);
    expect(SCHEDULED_TASK_WINDOW_END_HOUR).toBe(13);
  });

  describe("isWithinScheduledTaskWindow", () => {
    it("08:00 应允许执行", () => {
      expect(
        isWithinScheduledTaskWindow(new Date("2024-06-13T08:00:00+08:00")),
      ).toBe(true);
    });

    it("13:59 应允许执行", () => {
      expect(
        isWithinScheduledTaskWindow(new Date("2024-06-13T13:59:00+08:00")),
      ).toBe(true);
    });

    it("14:00 应禁止执行", () => {
      expect(
        isWithinScheduledTaskWindow(new Date("2024-06-13T14:00:00+08:00")),
      ).toBe(false);
    });

    it("02:00 应禁止执行", () => {
      expect(
        isWithinScheduledTaskWindow(new Date("2024-06-13T02:00:00+08:00")),
      ).toBe(false);
    });
  });

  describe("clampScheduledWindowHour", () => {
    it("应该限制在 8–13 范围内", () => {
      expect(clampScheduledWindowHour(0)).toBe(8);
      expect(clampScheduledWindowHour(22)).toBe(13);
      expect(clampScheduledWindowHour(10)).toBe(10);
    });
  });
});

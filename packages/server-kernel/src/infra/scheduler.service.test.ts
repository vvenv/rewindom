import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { JobRegistry } from "../runtime/job-registry.js";

import {
  getMsUntilLocalTime,
  startBackgroundScheduler,
  stopBackgroundScheduler,
} from "./scheduler.service.js";

describe("scheduler.service", () => {
  let mockApp: {
    log: {
      info: ReturnType<typeof vi.fn>;
      error: ReturnType<typeof vi.fn>;
    };
  };
  let registry: JobRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    stopBackgroundScheduler();
    vi.useFakeTimers();
    registry = new JobRegistry();

    mockApp = {
      log: {
        info: vi.fn(),
        error: vi.fn(),
      },
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    stopBackgroundScheduler();
  });

  describe("getMsUntilLocalTime", () => {
    it("should return delay until next occurrence today when time not passed", () => {
      vi.setSystemTime(new Date(2026, 5, 13, 1, 0, 0));

      expect(getMsUntilLocalTime(3, 0)).toBe(2 * 60 * 60 * 1000);
    });

    it("should schedule next day when time already passed", () => {
      vi.setSystemTime(new Date(2026, 5, 13, 12, 0, 0));

      expect(getMsUntilLocalTime(3, 0)).toBe(15 * 60 * 60 * 1000);
    });
  });

  describe("startBackgroundScheduler", () => {
    it("should start all registered jobs and log job count", () => {
      const startFn = vi.fn();
      registry.register({
        id: "test-job",
        moduleId: "test",
        label: "Test job",
        start: startFn,
      });

      startBackgroundScheduler(mockApp as never, registry);

      expect(startFn).toHaveBeenCalled();
      expect(mockApp.log.info).toHaveBeenCalledWith(
        { jobCount: 1 },
        "[scheduler] 已启动模块注册的后台任务",
      );
    });

    it("should run job at scheduled local time", () => {
      const handler = vi.fn();
      let timeoutId: number | undefined;

      registry.register({
        id: "daily-job",
        moduleId: "test",
        label: "Daily job",
        start: () => {
          timeoutId = setTimeout(handler, getMsUntilLocalTime(8, 35));
        },
        stop: () => {
          if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
            timeoutId = undefined;
          }
        },
      });

      vi.setSystemTime(new Date(2026, 5, 13, 8, 34, 0));
      startBackgroundScheduler(mockApp as never, registry);

      vi.advanceTimersByTime(61 * 1000);

      expect(handler).toHaveBeenCalled();
    });

    it("should run interval-based job handlers", () => {
      const handler = vi.fn();
      let intervalId: number | undefined;

      registry.register({
        id: "interval-job",
        moduleId: "test",
        label: "Interval job",
        start: () => {
          intervalId = setInterval(handler, 30 * 60 * 1000);
        },
        stop: () => {
          if (intervalId !== undefined) {
            clearInterval(intervalId);
            intervalId = undefined;
          }
        },
      });

      startBackgroundScheduler(mockApp as never, registry);

      vi.advanceTimersByTime(30 * 60 * 1000);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe("stopBackgroundScheduler", () => {
    it("should clear all intervals and timeouts", () => {
      const handler = vi.fn();
      let intervalId: number | undefined;

      registry.register({
        id: "interval-job",
        moduleId: "test",
        label: "Interval job",
        start: () => {
          intervalId = setInterval(handler, 30 * 60 * 1000);
        },
        stop: () => {
          if (intervalId !== undefined) {
            clearInterval(intervalId);
            intervalId = undefined;
          }
        },
      });

      startBackgroundScheduler(mockApp as never, registry);
      stopBackgroundScheduler();

      vi.advanceTimersByTime(24 * 60 * 60 * 1000);

      expect(handler).not.toHaveBeenCalled();
    });

    it("should be idempotent", () => {
      startBackgroundScheduler(mockApp as never, registry);
      stopBackgroundScheduler();
      expect(() => stopBackgroundScheduler()).not.toThrow();
    });
  });
});

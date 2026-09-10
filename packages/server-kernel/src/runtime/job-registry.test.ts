import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  addJobRunRecorder,
  JobRegistry,
  resetJobRunRecorders,
  type JobRunSample,
} from "./job-registry.js";

function deferred(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("JobRegistry", () => {
  let registry: JobRegistry;

  beforeEach(() => {
    vi.useFakeTimers();
    resetJobRunRecorders();
    registry = new JobRegistry();
  });

  afterEach(() => {
    registry.stopAll();
    resetJobRunRecorders();
    vi.useRealTimers();
  });

  it("rejects a schedule without a run body", () => {
    expect(() => {
      registry.register({
        id: "broken",
        moduleId: "test",
        label: "Broken",
        schedules: [{ kind: "interval", every_ms: 1000 }],
      });
    }).toThrow(/broken/);
  });

  describe("declarative schedules", () => {
    it("owns the interval so the module does not", async () => {
      const run = vi.fn();
      registry.register({
        id: "tick",
        moduleId: "test",
        label: "Tick",
        schedules: [{ kind: "interval", every_ms: 1000 }],
        run,
      });

      registry.startAll();
      expect(run).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1000);
      expect(run).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(2000);
      expect(run).toHaveBeenCalledTimes(3);
    });

    it("runs immediately when run_on_start is set", async () => {
      const run = vi.fn();
      registry.register({
        id: "eager",
        moduleId: "test",
        label: "Eager",
        schedules: [{ kind: "interval", every_ms: 1000, run_on_start: true }],
        run,
      });

      registry.startAll();
      await vi.advanceTimersByTimeAsync(0);

      expect(run).toHaveBeenCalledTimes(1);
    });

    it("waits out initial_delay_ms before arming the interval", async () => {
      const run = vi.fn();
      registry.register({
        id: "delayed",
        moduleId: "test",
        label: "Delayed",
        schedules: [
          {
            kind: "interval",
            every_ms: 1000,
            initial_delay_ms: 5000,
            run_on_start: true,
          },
        ],
        run,
      });

      registry.startAll();
      await vi.advanceTimersByTimeAsync(4999);
      expect(run).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(run).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1000);
      expect(run).toHaveBeenCalledTimes(2);
    });

    it("fires a daily schedule at the local time and re-arms", async () => {
      vi.setSystemTime(new Date(2026, 5, 13, 8, 34, 0));
      const run = vi.fn();
      registry.register({
        id: "daily",
        moduleId: "test",
        label: "Daily",
        schedules: [{ kind: "daily", hour: 8, minute: 35 }],
        run,
      });

      registry.startAll();
      await vi.advanceTimersByTimeAsync(61 * 1000);
      expect(run).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
      expect(run).toHaveBeenCalledTimes(2);
    });

    it("stopAll clears registry-owned timers", async () => {
      const run = vi.fn();
      registry.register({
        id: "tick",
        moduleId: "test",
        label: "Tick",
        schedules: [
          { kind: "interval", every_ms: 1000 },
          { kind: "daily", hour: 8, minute: 35 },
        ],
        run,
      });

      registry.startAll();
      registry.stopAll();
      await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);

      expect(run).not.toHaveBeenCalled();
    });
  });

  describe("run state", () => {
    it("records duration and success", async () => {
      registry.register({
        id: "ok-job",
        moduleId: "test",
        label: "OK job",
        schedules: [{ kind: "interval", every_ms: 1000 }],
        run: async () => {
          await vi.advanceTimersByTimeAsync(0);
        },
      });

      await registry.runJobOnce("ok-job");

      const state = registry.getRunStates()[0]!;
      expect(state.status).toBe("ok");
      expect(state.run_count).toBe(1);
      expect(state.failure_count).toBe(0);
      expect(state.consecutive_failures).toBe(0);
      expect(state.last_run_at).not.toBeNull();
      expect(state.last_success_at).toBe(state.last_run_at);
      expect(state.last_duration_ms).toBeGreaterThanOrEqual(0);
      expect(state.last_error).toBeNull();
    });

    it("counts consecutive failures and keeps the last error", async () => {
      let attempt = 0;
      registry.register({
        id: "flaky",
        moduleId: "test",
        label: "Flaky",
        schedules: [{ kind: "interval", every_ms: 1000 }],
        run: () => {
          attempt += 1;
          throw new Error(`boom ${attempt}`);
        },
      });

      await registry.runJobOnce("flaky");
      await registry.runJobOnce("flaky");

      const state = registry.getRunStates()[0]!;
      expect(state.status).toBe("error");
      expect(state.run_count).toBe(2);
      expect(state.failure_count).toBe(2);
      expect(state.consecutive_failures).toBe(2);
      expect(state.last_error).toBe("boom 2");
      // 失败不该冒充成功：上次成功时间仍为空
      expect(state.last_success_at).toBeNull();
    });

    it("resets the failure streak once a run succeeds", async () => {
      let fail = true;
      registry.register({
        id: "recovering",
        moduleId: "test",
        label: "Recovering",
        schedules: [{ kind: "interval", every_ms: 1000 }],
        run: () => {
          if (fail) throw new Error("boom");
        },
      });

      await registry.runJobOnce("recovering");
      fail = false;
      await registry.runJobOnce("recovering");

      const state = registry.getRunStates()[0]!;
      expect(state.status).toBe("ok");
      expect(state.consecutive_failures).toBe(0);
      expect(state.failure_count).toBe(1);
      expect(state.last_error).toBeNull();
    });

    it("skips an overlapping run instead of stacking two", async () => {
      const gate = deferred();
      registry.register({
        id: "slow",
        moduleId: "test",
        label: "Slow",
        schedules: [{ kind: "interval", every_ms: 1000 }],
        run: () => gate.promise,
      });

      const first = registry.runJobOnce("slow");
      await registry.runJobOnce("slow");

      expect(registry.getRunStates()[0]!.skipped_count).toBe(1);

      gate.resolve();
      await first;

      const state = registry.getRunStates()[0]!;
      expect(state.run_count).toBe(1);
      expect(state.skipped_count).toBe(1);
    });

    it("logs a failure through the scheduler logger", async () => {
      const log = { error: vi.fn(), info: vi.fn() };
      registry.register({
        id: "loud",
        moduleId: "test",
        label: "Loud",
        schedules: [{ kind: "interval", every_ms: 1000 }],
        run: () => {
          throw new Error("boom");
        },
      });

      registry.startAll(log as never);
      await registry.runJobOnce("loud");

      expect(log.error).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: "loud", moduleId: "test" }),
        "[scheduler] 任务执行失败",
      );
    });

    it("leaves imperative jobs out of the run states", () => {
      registry.register({
        id: "listener",
        moduleId: "test",
        label: "Listener",
        start: vi.fn(),
      });

      expect(registry.getRunStates()).toHaveLength(0);
      expect(registry.getJobs()).toHaveLength(1);
    });
  });

  describe("recorders", () => {
    it("notifies every subscriber on success and failure", async () => {
      const samples: JobRunSample[] = [];
      const other: JobRunSample[] = [];
      addJobRunRecorder((sample) => samples.push(sample));
      addJobRunRecorder((sample) => other.push(sample));

      let fail = true;
      registry.register({
        id: "watched",
        moduleId: "test",
        label: "Watched",
        schedules: [{ kind: "interval", every_ms: 1000 }],
        run: () => {
          if (fail) throw new Error("boom");
        },
      });

      await registry.runJobOnce("watched");
      fail = false;
      await registry.runJobOnce("watched");

      expect(samples).toHaveLength(2);
      expect(other).toHaveLength(2);
      expect(samples[0]).toMatchObject({
        job_id: "watched",
        module_id: "test",
        status: "error",
        error: "boom",
        consecutive_failures: 1,
      });
      expect(samples[1]).toMatchObject({
        status: "ok",
        consecutive_failures: 0,
      });
    });

    it("a throwing subscriber neither breaks the job nor the other subscribers", async () => {
      const samples: JobRunSample[] = [];
      addJobRunRecorder(() => {
        throw new Error("subscriber exploded");
      });
      addJobRunRecorder((sample) => samples.push(sample));

      registry.register({
        id: "watched",
        moduleId: "test",
        label: "Watched",
        schedules: [{ kind: "interval", every_ms: 1000 }],
        run: vi.fn(),
      });

      await expect(registry.runJobOnce("watched")).resolves.toBeUndefined();
      expect(samples).toHaveLength(1);
      expect(registry.getRunStates()[0]!.status).toBe("ok");
    });

    it("unsubscribes", async () => {
      const samples: JobRunSample[] = [];
      const off = addJobRunRecorder((sample) => samples.push(sample));

      registry.register({
        id: "watched",
        moduleId: "test",
        label: "Watched",
        schedules: [{ kind: "interval", every_ms: 1000 }],
        run: vi.fn(),
      });

      await registry.runJobOnce("watched");
      off();
      await registry.runJobOnce("watched");

      expect(samples).toHaveLength(1);
    });
  });
});

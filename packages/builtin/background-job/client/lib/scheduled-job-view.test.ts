import { describe, expect, it } from "vitest";

import {
  formatJobDuration,
  jobErrorLogsPath,
  scheduleDescriptor,
  scheduleDescriptors,
  scheduledJobTone,
  sortScheduledJobs,
} from "./scheduled-job-view.js";

import type { ScheduledJobState } from "../../shared/scheduled-job.js";

function job(overrides: Partial<ScheduledJobState> = {}): ScheduledJobState {
  return {
    id: "job-1",
    module_id: "test",
    label: "Job 1",
    schedules: [{ kind: "interval", every_ms: 60_000 }],
    status: "ok",
    last_run_at: "2026-09-09T00:00:00.000Z",
    last_success_at: "2026-09-09T00:00:00.000Z",
    last_duration_ms: 12,
    last_error: null,
    run_count: 3,
    failure_count: 0,
    consecutive_failures: 0,
    skipped_count: 0,
    ...overrides,
  };
}

describe("scheduleDescriptor", () => {
  it("picks the largest whole unit", () => {
    expect(scheduleDescriptor({ kind: "interval", every_ms: 30_000 })).toEqual({
      key: "scheduledJobs.schedule.everySeconds",
      params: { count: 30 },
    });
    expect(
      scheduleDescriptor({ kind: "interval", every_ms: 30 * 60_000 }),
    ).toEqual({
      key: "scheduledJobs.schedule.everyMinutes",
      params: { count: 30 },
    });
    expect(
      scheduleDescriptor({ kind: "interval", every_ms: 2 * 60 * 60_000 }),
    ).toEqual({
      key: "scheduledJobs.schedule.everyHours",
      params: { count: 2 },
    });
  });

  it("falls back to seconds when the interval is not a whole minute", () => {
    expect(scheduleDescriptor({ kind: "interval", every_ms: 90_000 })).toEqual({
      key: "scheduledJobs.schedule.everySeconds",
      params: { count: 90 },
    });
  });

  it("never renders 0 seconds for a sub-second interval", () => {
    expect(scheduleDescriptor({ kind: "interval", every_ms: 200 })).toEqual({
      key: "scheduledJobs.schedule.everySeconds",
      params: { count: 1 },
    });
  });

  it("zero-pads a daily time", () => {
    expect(scheduleDescriptor({ kind: "daily", hour: 8, minute: 5 })).toEqual({
      key: "scheduledJobs.schedule.daily",
      params: { time: "08:05" },
    });
  });

  it("describes every schedule a job carries", () => {
    expect(
      scheduleDescriptors([
        { kind: "interval", every_ms: 30 * 60_000 },
        { kind: "daily", hour: 8, minute: 30 },
      ]),
    ).toHaveLength(2);
  });
});

describe("scheduledJobTone", () => {
  it("is red while failing", () => {
    expect(
      scheduledJobTone(job({ status: "error", consecutive_failures: 1 })),
    ).toBe("danger");
  });

  it("turns green again once a run succeeds, keeping failure_count as history", () => {
    expect(
      scheduledJobTone(
        job({ status: "ok", consecutive_failures: 0, failure_count: 4 }),
      ),
    ).toBe("success");
  });

  it("is yellow while re-running with the streak still unbroken", () => {
    expect(
      scheduledJobTone(job({ status: "running", consecutive_failures: 2 })),
    ).toBe("warning");
  });

  it("is neutral before the first run", () => {
    expect(
      scheduledJobTone(
        job({
          status: "idle",
          last_run_at: null,
          last_success_at: null,
          run_count: 0,
        }),
      ),
    ).toBe("default");
  });
});

describe("sortScheduledJobs", () => {
  it("puts failing jobs first, then jobs with a history of failure", () => {
    const sorted = sortScheduledJobs([
      job({ id: "healthy" }),
      job({ id: "recovered", failure_count: 2 }),
      job({ id: "broken", status: "error", consecutive_failures: 5 }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual([
      "broken",
      "recovered",
      "healthy",
    ]);
  });

  it("breaks ties by streak, then by id", () => {
    const sorted = sortScheduledJobs([
      job({ id: "b", status: "error", consecutive_failures: 1 }),
      job({ id: "a", status: "error", consecutive_failures: 1 }),
      job({ id: "c", status: "error", consecutive_failures: 9 }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["c", "a", "b"]);
  });

  it("does not mutate the input", () => {
    const input = [job({ id: "b" }), job({ id: "a" })];
    sortScheduledJobs(input);
    expect(input.map((item) => item.id)).toEqual(["b", "a"]);
  });
});

describe("formatJobDuration", () => {
  it("renders ms under a second and seconds above", () => {
    expect(formatJobDuration(null)).toBe("—");
    expect(formatJobDuration(12)).toBe("12ms");
    expect(formatJobDuration(1500)).toBe("1.5s");
  });
});

describe("jobErrorLogsPath", () => {
  it("links to the job's ErrorLog history", () => {
    expect(jobErrorLogsPath("slow-query-cleanup")).toBe(
      "/platform/error-logs?q=job%3Aslow-query-cleanup",
    );
  });
});

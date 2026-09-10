import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@rewindom/server-kernel/lib/config.js", () => ({
  config: {
    observability: { errorLog: { enabled: true } },
  },
}));

vi.mock("./error.service.js", () => ({
  ErrorService: {
    logError: vi.fn().mockResolvedValue(undefined),
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

import { ErrorService } from "./error.service.js";

import {
  recordJobRun,
  resetJobFailureState,
  JOB_FAILURE_CODE,
  JOB_RECOVERY_CODE,
} from "./job-failure-jobs.js";
import { createLogDebouncer } from "./process-exception.js";

import type { JobRunSample } from "@rewindom/server-kernel/runtime/job-registry.js";

function sample(overrides: Partial<JobRunSample> = {}): JobRunSample {
  return {
    job_id: "slow-query-cleanup",
    module_id: "slow-query",
    label: "Slow query log cleanup",
    status: "error",
    duration_ms: 12,
    error: "connection refused",
    consecutive_failures: 1,
    ...overrides,
  };
}

describe("recordJobRun", () => {
  let debounce: ReturnType<typeof createLogDebouncer>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetJobFailureState();
    debounce = createLogDebouncer(60_000);
  });

  it("writes a failure as job:<id>", async () => {
    await recordJobRun(sample(), debounce);

    expect(ErrorService.logError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Slow query log cleanup failed: connection refused",
      }),
      expect.objectContaining({
        route: "job:slow-query-cleanup",
        errorCode: JOB_FAILURE_CODE,
        additionalContext: expect.objectContaining({
          source: "job",
          job_id: "slow-query-cleanup",
          module_id: "slow-query",
          consecutive_failures: 1,
        }),
      }),
    );
  });

  it("does not write anything on a plain success", async () => {
    await recordJobRun(
      sample({ status: "ok", consecutive_failures: 0 }),
      debounce,
    );

    expect(ErrorService.logError).not.toHaveBeenCalled();
    expect(ErrorService.log).not.toHaveBeenCalled();
  });

  it("collapses the same failure inside the debounce window", async () => {
    await recordJobRun(sample(), debounce);
    await recordJobRun(sample({ consecutive_failures: 2 }), debounce);
    await recordJobRun(sample({ consecutive_failures: 3 }), debounce);

    expect(ErrorService.logError).toHaveBeenCalledTimes(1);
  });

  it("still writes when the failure reason changes", async () => {
    await recordJobRun(sample(), debounce);
    await recordJobRun(
      sample({ error: "timeout", consecutive_failures: 2 }),
      debounce,
    );

    expect(ErrorService.logError).toHaveBeenCalledTimes(2);
  });

  it("logs recovery as info, but only after a failure", async () => {
    await recordJobRun(sample(), debounce);
    await recordJobRun(
      sample({ status: "ok", consecutive_failures: 0 }),
      debounce,
    );

    expect(ErrorService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "info",
        message: "Slow query log cleanup recovered",
        route: "job:slow-query-cleanup",
        errorCode: JOB_RECOVERY_CODE,
      }),
    );

    await recordJobRun(
      sample({ status: "ok", consecutive_failures: 0 }),
      debounce,
    );
    expect(ErrorService.log).toHaveBeenCalledTimes(1);
  });
});

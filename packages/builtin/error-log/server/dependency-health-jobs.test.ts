import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@rewindom/server-kernel/lib/config.js", () => ({
  config: {
    observability: { errorLog: { enabled: true } },
  },
}));

vi.mock("@rewindom/server-kernel/lib/dependency-health.js", () => ({
  checkDependencies: vi.fn(),
}));

vi.mock("./error.service.js", () => ({
  ErrorService: {
    logError: vi.fn().mockResolvedValue(undefined),
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

import { ErrorService } from "./error.service.js";

import {
  recordDependencyTransitions,
  resetDependencyHealthState,
} from "./dependency-health-jobs.js";

import type { DependencyHealth } from "../shared/index.js";

function snapshot(
  postgres: "ok" | "error",
  redis: "ok" | "error",
): DependencyHealth {
  const ready = postgres === "ok";
  const status =
    postgres === "error" ? "error" : redis === "error" ? "degraded" : "ok";
  return {
    status,
    ready,
    checked_at: "2026-09-09T00:00:00.000Z",
    checks: [
      {
        name: "postgres",
        status: postgres,
        required: true,
        latency_ms: 2,
        error: postgres === "error" ? "db down" : undefined,
      },
      {
        name: "redis",
        status: redis,
        required: false,
        latency_ms: 1,
        error: redis === "error" ? "pong failed" : undefined,
      },
    ],
  };
}

describe("recordDependencyTransitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDependencyHealthState();
  });

  it("logs only when a dependency flips to unhealthy", async () => {
    await recordDependencyTransitions(snapshot("ok", "ok"));
    expect(ErrorService.logError).not.toHaveBeenCalled();

    await recordDependencyTransitions(snapshot("ok", "error"));
    expect(ErrorService.logError).toHaveBeenCalledTimes(1);
    expect(ErrorService.logError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "redis unhealthy: pong failed" }),
      expect.objectContaining({
        route: "service:redis",
        errorCode: "DependencyUnhealthy",
      }),
    );

    await recordDependencyTransitions(snapshot("ok", "error"));
    expect(ErrorService.logError).toHaveBeenCalledTimes(1);
  });

  it("logs recovery as info", async () => {
    await recordDependencyTransitions(snapshot("error", "ok"));
    await recordDependencyTransitions(snapshot("ok", "ok"));
    expect(ErrorService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "info",
        message: "postgres recovered",
        route: "service:postgres",
        errorCode: "DependencyRecovered",
      }),
    );
  });
});

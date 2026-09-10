import { describe, expect, it } from "vitest";

import {
  buildCountChartRows,
  checkHealthKpiVariant,
  dependencyErrorLogsPath,
  formatPlatformCountLabel,
  overallHealthAlertVariant,
  truncatePlatformLabel,
} from "./error-log-dashboard.js";

describe("error-log-dashboard", () => {
  it("builds top count rows from a record", () => {
    expect(
      buildCountChartRows({
        "/api/a": 2,
        "/api/b": 5,
        "/api/c": 1,
      }),
    ).toEqual([
      { name: "/api/b", fullName: "/api/b", value: 5 },
      { name: "/api/a", fullName: "/api/a", value: 2 },
      { name: "/api/c", fullName: "/api/c", value: 1 },
    ]);
  });

  it("truncates labels and formats counts", () => {
    expect(truncatePlatformLabel("abcdef", 4)).toBe("abcd…");
    expect(formatPlatformCountLabel(undefined, true)).toBe("—");
    expect(formatPlatformCountLabel(12, false)).toBe("12");
  });

  it("maps overall and per-check tones, and links to service logs", () => {
    expect(overallHealthAlertVariant("ok")).toBe("success");
    expect(overallHealthAlertVariant("degraded")).toBe("warning");
    expect(overallHealthAlertVariant("error")).toBe("destructive");
    expect(checkHealthKpiVariant({ status: "ok", required: true })).toBe(
      "success",
    );
    expect(checkHealthKpiVariant({ status: "error", required: false })).toBe(
      "warning",
    );
    expect(checkHealthKpiVariant({ status: "error", required: true })).toBe(
      "danger",
    );
    expect(dependencyErrorLogsPath("redis")).toBe(
      "/platform/error-logs?q=service%3Aredis",
    );
  });
});

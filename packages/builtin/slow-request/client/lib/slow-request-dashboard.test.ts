import { describe, expect, it } from "vitest";

import {
  buildRouteChartRows,
  formatPlatformDuration,
  truncatePlatformLabel,
} from "./slow-request-dashboard.js";

describe("slow-request-dashboard", () => {
  it("formats duration", () => {
    expect(formatPlatformDuration(500)).toBe("500ms");
    expect(formatPlatformDuration(1500)).toBe("1.5s");
  });

  it("builds top route rows by average duration", () => {
    expect(
      buildRouteChartRows([
        { route: "/api/a", method: "GET", avg_duration_ms: 200 },
        { route: "/api/b", method: "POST", avg_duration_ms: 900 },
      ]),
    ).toEqual([
      { name: "POST /api/b", fullName: "POST /api/b", value: 900 },
      { name: "GET /api/a", fullName: "GET /api/a", value: 200 },
    ]);
  });

  it("truncates labels", () => {
    expect(truncatePlatformLabel("abcdef", 4)).toBe("abcd…");
  });
});

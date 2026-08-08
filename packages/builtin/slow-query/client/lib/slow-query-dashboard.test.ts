import { describe, expect, it } from "vitest";

import {
  buildFingerprintChartRows,
  buildRouteChartRows,
  formatPlatformDuration,
  truncatePlatformLabel,
} from "./slow-query-dashboard.js";

describe("slow-query-dashboard", () => {
  it("formats duration", () => {
    expect(formatPlatformDuration(500)).toBe("500ms");
    expect(formatPlatformDuration(1500)).toBe("1.5s");
  });

  it("builds top route rows", () => {
    expect(
      buildRouteChartRows([
        { route: "/api/a", count: 2 },
        { route: "/api/b", count: 5 },
      ]),
    ).toEqual([
      { name: "/api/b", fullName: "/api/b", value: 5 },
      { name: "/api/a", fullName: "/api/a", value: 2 },
    ]);
  });

  it("truncates fingerprint labels", () => {
    expect(truncatePlatformLabel("abcdef", 4)).toBe("abcd…");
    expect(
      buildFingerprintChartRows([
        { fingerprint: "select * from users", max_duration_ms: 1200 },
      ])[0]?.name,
    ).toBe("select * from users");
  });
});

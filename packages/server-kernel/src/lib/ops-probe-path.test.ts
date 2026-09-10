import { describe, expect, it } from "vitest";

import { isOpsProbePath, OPS_PROBE_PATHS } from "./ops-probe-path.js";

describe("isOpsProbePath", () => {
  it("matches liveness and readiness", () => {
    expect(OPS_PROBE_PATHS.has("/health")).toBe(true);
    expect(OPS_PROBE_PATHS.has("/ready")).toBe(true);
    expect(isOpsProbePath("/health")).toBe(true);
    expect(isOpsProbePath("/ready")).toBe(true);
  });

  it("strips the query string", () => {
    expect(isOpsProbePath("/health?ready=1")).toBe(true);
    expect(isOpsProbePath("/ready?verbose=1")).toBe(true);
  });

  it("does not match nearby paths", () => {
    expect(isOpsProbePath("/api/health")).toBe(false);
    expect(isOpsProbePath("/healthz")).toBe(false);
    expect(isOpsProbePath("/readyz")).toBe(false);
    expect(isOpsProbePath("/api/system-info")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { trafficBarPercent } from "./traffic-bar.js";

describe("trafficBarPercent", () => {
  it("returns 0 when there is no volume to scale against", () => {
    expect(trafficBarPercent(10, 0)).toBe(0);
    expect(trafficBarPercent(0, 100)).toBe(0);
    expect(trafficBarPercent(-1, 100)).toBe(0);
  });

  it("maps the busiest source to 100%", () => {
    expect(trafficBarPercent(80, 80)).toBe(100);
  });

  it("scales smaller sources and never drops below 4%", () => {
    expect(trafficBarPercent(40, 80)).toBe(50);
    expect(trafficBarPercent(1, 10_000)).toBe(4);
  });
});

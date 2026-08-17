import { describe, expect, it } from "vitest";

import { computeHeat, resolveStatus, type HeatSignal } from "./heat.js";

const NOW = new Date("2025-08-12T12:00:00Z");

function hoursAgo(hours: number): Date {
  return new Date(NOW.getTime() - hours * 60 * 60 * 1000);
}

function signal(overrides: Partial<HeatSignal> = {}): HeatSignal {
  return {
    published_at: hoursAgo(1),
    score: 0,
    comment_count: 0,
    source_kind: "community",
    ...overrides,
  };
}

describe("computeHeat", () => {
  it("没有信号时热度与增速都是 0", () => {
    expect(computeHeat([], NOW)).toEqual({ heat_score: 0, velocity_pct: 0 });
  });

  it("只统计最近两个窗口，更早的信号不计入", () => {
    const old = computeHeat([signal({ published_at: hoursAgo(48) })], NOW);
    expect(old.heat_score).toBe(0);
    expect(old.velocity_pct).toBe(0);
  });

  it("一手来源权重高于社区", () => {
    const official = computeHeat([signal({ source_kind: "official" })], NOW);
    const community = computeHeat([signal({ source_kind: "community" })], NOW);
    expect(official.heat_score).toBeGreaterThan(community.heat_score);
  });

  it("互动量以对数计入，避免单条爆款吃掉全部权重", () => {
    const low = computeHeat([signal({ score: 10 })], NOW).heat_score;
    const high = computeHeat([signal({ score: 1000 })], NOW).heat_score;
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThan(low * 3);
  });

  it("新窗口有量、旧窗口为空时给出正增速", () => {
    const result = computeHeat([signal({ published_at: hoursAgo(1) })], NOW);
    expect(result.velocity_pct).toBeGreaterThan(0);
  });

  it("新事件的出生爆发滑出近窗 → 增速为 0，不主张下降", () => {
    const result = computeHeat([signal({ published_at: hoursAgo(9) })], NOW);
    expect(result.heat_score).toBe(0);
    expect(result.velocity_pct).toBe(0);
  });

  it("两个窗口都有量且近窗更弱 → 即便事件还新也记减速", () => {
    const result = computeHeat(
      [
        signal({ published_at: hoursAgo(8), score: 200 }),
        signal({ published_at: hoursAgo(8), score: 200 }),
        signal({ published_at: hoursAgo(1), score: 0 }),
      ],
      NOW,
    );
    expect(result.velocity_pct).toBeLessThan(0);
  });

  it("事件在上一窗打开之前就存在、近窗已空 → 这才是热度回落，且不低于 -100%", () => {
    const result = computeHeat(
      [
        signal({ published_at: hoursAgo(20) }),
        signal({ published_at: hoursAgo(9) }),
      ],
      NOW,
    );
    expect(result.velocity_pct).toBe(-100);
  });

  it("增速封顶在 1000%", () => {
    const signals = Array.from({ length: 50 }, () =>
      signal({ published_at: hoursAgo(1), score: 500 }),
    );
    expect(computeHeat(signals, NOW).velocity_pct).toBe(1000);
  });
});

describe("resolveStatus", () => {
  it("最近有动静且快速上升 → developing", () => {
    expect(
      resolveStatus({ last_activity_at: hoursAgo(1), velocity_pct: 120, now: NOW }),
    ).toBe("developing");
  });

  it("最近有动静但增速平缓 → active", () => {
    expect(
      resolveStatus({ last_activity_at: hoursAgo(1), velocity_pct: 10, now: NOW }),
    ).toBe("active");
  });

  it("半天没动静 → active（仍在 24 小时内）", () => {
    expect(
      resolveStatus({ last_activity_at: hoursAgo(12), velocity_pct: 0, now: NOW }),
    ).toBe("active");
  });

  it("新事件出生爆发滑出近窗后，阶段仍是 active，不是 cooling", () => {
    const heat = computeHeat([signal({ published_at: hoursAgo(9) })], NOW);
    expect(
      resolveStatus({
        last_activity_at: hoursAgo(9),
        velocity_pct: heat.velocity_pct,
        now: NOW,
      }),
    ).toBe("active");
  });

  it("有基线的明显降温 → cooling", () => {
    expect(
      resolveStatus({ last_activity_at: hoursAgo(2), velocity_pct: -80, now: NOW }),
    ).toBe("cooling");
  });

  it("超过一天没动静 → cooling", () => {
    expect(
      resolveStatus({ last_activity_at: hoursAgo(30), velocity_pct: 0, now: NOW }),
    ).toBe("cooling");
  });

  it("超过一周没动静 → resolved", () => {
    expect(
      resolveStatus({ last_activity_at: hoursAgo(24 * 8), velocity_pct: 0, now: NOW }),
    ).toBe("resolved");
  });
});

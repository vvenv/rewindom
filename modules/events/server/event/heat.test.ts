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
    source_name: "Hacker News",
    ...overrides,
  };
}

describe("computeHeat", () => {
  it("没有信号时热度与增速都是 0，且没有基线", () => {
    expect(computeHeat([], NOW)).toEqual({
      heat_score: 0,
      velocity_pct: 0,
      has_velocity_baseline: false,
      recent_signal_count: 0,
      recent_source_count: 0,
    });
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

  /*
   * 线上（yestino.com/events）实测出的退化：首页 16 张卡增速全部落在 376%~516%，
   * 且「正在升温」与「正在发生」是同一个排序。旧实现在 previous = 0 时取 base = 1，
   * 于是 velocity_pct = ((recent - 0) / 1) * 100 = heat_score * 100 —— 两个指标恒等。
   * 这两条钉住「没有上一窗口就不产出比率」。
   */
  it("旧窗口为空时不产出增速——那不是增长率，是这个事件第一次出现", () => {
    const result = computeHeat([signal({ published_at: hoursAgo(1) })], NOW);
    expect(result.velocity_pct).toBe(0);
    expect(result.has_velocity_baseline).toBe(false);
  });

  it("缺基线时 velocity_pct 不再等于 heat_score * 100", () => {
    const result = computeHeat(
      [signal({ published_at: hoursAgo(1), score: 500, comment_count: 200 })],
      NOW,
    );
    expect(result.heat_score).toBeGreaterThan(0);
    expect(result.velocity_pct).not.toBe(result.heat_score * 100);
  });

  it("两个窗口都有量时才给出正增速", () => {
    const result = computeHeat(
      [
        signal({ published_at: hoursAgo(8) }),
        signal({ published_at: hoursAgo(1), score: 300 }),
      ],
      NOW,
    );
    expect(result.velocity_pct).toBeGreaterThan(0);
    expect(result.has_velocity_baseline).toBe(true);
  });

  it("近窗的新增量按条数与来源数分别计——同源多条不算多个来源", () => {
    const result = computeHeat(
      [
        signal({ published_at: hoursAgo(1), source_name: "Hacker News" }),
        signal({ published_at: hoursAgo(2), source_name: "Hacker News" }),
        signal({ published_at: hoursAgo(3), source_name: "TechCrunch" }),
        // 近窗之外，不计入
        signal({ published_at: hoursAgo(9), source_name: "BBC World" }),
      ],
      NOW,
    );
    expect(result.recent_signal_count).toBe(3);
    expect(result.recent_source_count).toBe(2);
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
    const signals = [
      // 上一窗口有量才谈得上倍数
      signal({ published_at: hoursAgo(8) }),
      ...Array.from({ length: 50 }, () =>
        signal({ published_at: hoursAgo(1), score: 500 }),
      ),
    ];
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

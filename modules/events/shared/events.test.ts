import { describe, expect, it } from "vitest";

import { describeEventMomentum } from "./events.js";

function item(overrides: {
  velocity_pct?: number;
  has_velocity_baseline?: boolean;
  recent_source_count?: number;
}) {
  return {
    velocity_pct: 0,
    has_velocity_baseline: false,
    recent_source_count: 0,
    ...overrides,
  };
}

describe("describeEventMomentum", () => {
  it("有基线时按涨跌幅主张", () => {
    expect(
      describeEventMomentum(
        item({ velocity_pct: 423.6, has_velocity_baseline: true }),
      ),
    ).toMatchObject({ kind: "rising", percent: 424 });
  });

  it("下降取绝对值", () => {
    expect(
      describeEventMomentum(
        item({ velocity_pct: -62, has_velocity_baseline: true }),
      ),
    ).toMatchObject({ kind: "falling", percent: 62 });
  });

  it("有基线的小幅波动 = 持平，不渲染——把噪声当趋势会让 Rising 区块失去可信度", () => {
    for (const pct of [4.9, -4.9, 0]) {
      expect(
        describeEventMomentum(
          item({ velocity_pct: pct, has_velocity_baseline: true }),
        ),
      ).toBeNull();
    }
  });

  /*
   * 没有基线时 velocity_pct 恒为 0，但那个 0 不是「持平」。旧实现在这里
   * 用 base = 1 造出一个百分比，结果全站卡片都写着 ↑400% 上下（线上实测）。
   * 现在改成主张一件可核对的事实：近窗有几个不同来源在跟进。
   */
  it("没有基线但多源跟进 → 主张扩散，而不是造一个百分比", () => {
    expect(
      describeEventMomentum(
        item({ has_velocity_baseline: false, recent_source_count: 3 }),
      ),
    ).toEqual({ kind: "spreading", percent: 0, source_count: 3 });
  });

  it("没有基线且只有单个来源 → 不渲染。一条帖子不叫扩散", () => {
    expect(
      describeEventMomentum(
        item({ has_velocity_baseline: false, recent_source_count: 1 }),
      ),
    ).toBeNull();
  });

  it("缺基线时 velocity_pct 再大也不作数——它不该有值，有值也是脏数据", () => {
    expect(
      describeEventMomentum(
        item({
          velocity_pct: 516,
          has_velocity_baseline: false,
          recent_source_count: 1,
        }),
      ),
    ).toBeNull();
  });
});

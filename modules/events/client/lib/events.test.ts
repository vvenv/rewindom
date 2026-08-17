import { describe, expect, it } from "vitest";

import {
  describeVelocity,
  formatSourceNames,
  fromEventSortValue,
  groupByDay,
  relativeTimeParts,
  toEventSortValue,
} from "./events.js";

describe("排序取值映射", () => {
  it("往返映射保持一致", () => {
    for (const value of ["latest", "rising", "hottest", "earliest"] as const) {
      const { sortBy, sortDir } = fromEventSortValue(value);
      expect(toEventSortValue(sortBy, sortDir)).toBe(value);
    }
  });

  it("未知取值回落到默认排序", () => {
    expect(fromEventSortValue("nonsense")).toEqual({
      sortBy: "last_activity_at",
      sortDir: "desc",
    });
    expect(toEventSortValue("unknown_field", "asc")).toBe("latest");
  });

  it("只用服务端白名单里的字段", () => {
    const allowed = new Set([
      "last_activity_at",
      "first_seen_at",
      "heat_score",
      "velocity_pct",
      "signal_count",
    ]);
    for (const value of ["latest", "rising", "hottest", "earliest"] as const) {
      expect(allowed.has(fromEventSortValue(value).sortBy)).toBe(true);
    }
  });
});

describe("describeVelocity", () => {
  it("上升", () => {
    expect(describeVelocity(423.6)).toEqual({ direction: "rising", percent: 424 });
  });

  it("下降取绝对值", () => {
    expect(describeVelocity(-62)).toEqual({ direction: "falling", percent: 62 });
  });

  it("小幅波动算持平——把噪声当趋势会让 Rising 区块失去可信度", () => {
    expect(describeVelocity(4.9).direction).toBe("steady");
    expect(describeVelocity(-4.9).direction).toBe("steady");
    expect(describeVelocity(0).direction).toBe("steady");
  });
});

describe("formatSourceNames", () => {
  it("用点号分隔", () => {
    expect(formatSourceNames(["OpenAI", "Hacker News"])).toBe("OpenAI · Hacker News");
  });

  it("超出上限时折叠成 +N", () => {
    expect(formatSourceNames(["a", "b", "c", "d", "e"])).toBe("a · b · c +2");
  });

  it("空列表返回空串", () => {
    expect(formatSourceNames([])).toBe("");
  });
});

describe("relativeTimeParts", () => {
  const now = new Date("2025-08-12T12:00:00Z");

  it("一小时内按分钟", () => {
    expect(relativeTimeParts("2025-08-12T11:23:00Z", now)).toEqual({
      value: -37,
      unit: "minute",
    });
  });

  it("一天内按小时", () => {
    expect(relativeTimeParts("2025-08-12T04:00:00Z", now)).toEqual({
      value: -8,
      unit: "hour",
    });
  });

  it("超过一天按天", () => {
    expect(relativeTimeParts("2025-08-09T12:00:00Z", now)).toEqual({
      value: -3,
      unit: "day",
    });
  });
});

describe("groupByDay", () => {
  it("按日期分桶并保持原顺序", () => {
    const grouped = groupByDay([
      { occurred_at: "2025-08-12T10:02:00Z" },
      { occurred_at: "2025-08-12T11:42:00Z" },
      { occurred_at: "2025-08-13T09:00:00Z" },
    ]);
    expect(grouped.map((g) => g.day)).toEqual(["2025-08-12", "2025-08-13"]);
    expect(grouped[0].entries).toHaveLength(2);
  });

  it("空输入返回空数组", () => {
    expect(groupByDay([])).toEqual([]);
  });
});

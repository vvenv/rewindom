import { describe, expect, it } from "vitest";

import {
  DAILY_ROTATION_OFFSET_MINUTES,
  localDayNumber,
  pickDailyIndex,
} from "./thing.util.js";

describe("localDayNumber", () => {
  it("同一天内恒定", () => {
    const morning = new Date("2026-08-27T00:30:00+08:00");
    const night = new Date("2026-08-27T23:30:00+08:00");
    expect(localDayNumber(morning, DAILY_ROTATION_OFFSET_MINUTES)).toBe(
      localDayNumber(night, DAILY_ROTATION_OFFSET_MINUTES),
    );
  });

  it("跨当地零点 +1", () => {
    const before = new Date("2026-08-27T23:59:59+08:00");
    const after = new Date("2026-08-28T00:00:01+08:00");
    expect(localDayNumber(after, DAILY_ROTATION_OFFSET_MINUTES)).toBe(
      localDayNumber(before, DAILY_ROTATION_OFFSET_MINUTES) + 1,
    );
  });

  it("北京时间早上八点不换——那正是 UTC 切日的时刻", () => {
    const sevenAm = new Date("2026-08-27T07:00:00+08:00");
    const nineAm = new Date("2026-08-27T09:00:00+08:00");
    expect(localDayNumber(nineAm, DAILY_ROTATION_OFFSET_MINUTES)).toBe(
      localDayNumber(sevenAm, DAILY_ROTATION_OFFSET_MINUTES),
    );
    // 对照：用 UTC 切日的话这两个时刻会落在不同的天，即八点换句子
    expect(localDayNumber(nineAm, 0)).toBe(localDayNumber(sevenAm, 0) + 1);
  });
});

describe("pickDailyIndex", () => {
  it("在 [0, count) 内循环", () => {
    expect(pickDailyIndex(0, 3)).toBe(0);
    expect(pickDailyIndex(1, 3)).toBe(1);
    expect(pickDailyIndex(2, 3)).toBe(2);
    expect(pickDailyIndex(3, 3)).toBe(0);
  });

  it("连续的天给出连续的下标", () => {
    const day = 20_000;
    const picks = [0, 1, 2, 3].map((d) => pickDailyIndex(day + d, 18));
    expect(new Set(picks).size).toBe(4);
  });

  it("负数天不会越界", () => {
    for (const d of [-1, -17, -18, -19]) {
      const i = pickDailyIndex(d, 18);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(18);
    }
  });

  it("空池子返回 0，由调用方先判空", () => {
    expect(pickDailyIndex(12_345, 0)).toBe(0);
  });
});

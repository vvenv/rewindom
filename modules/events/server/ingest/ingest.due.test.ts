import { describe, expect, it } from "vitest";

import { isFeedDue } from "./ingest.service.js";

const INTERVAL_MS = 15 * 60 * 1000;
const NOW = new Date("2026-08-19T12:00:00Z");

function minutesAgo(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * 60 * 1000);
}

describe("isFeedDue", () => {
  it("从没抓过的源立刻就抓", () => {
    expect(isFeedDue(null, NOW, INTERVAL_MS)).toBe(true);
  });

  it("满一个周期才抓", () => {
    expect(isFeedDue(minutesAgo(15), NOW, INTERVAL_MS)).toBe(true);
    expect(isFeedDue(minutesAgo(3), NOW, INTERVAL_MS)).toBe(false);
  });

  /**
   * 真实场景：`pnpm release` 重启进程，boot 后 20s 定时器就跑第一轮。
   * 上一轮才过去几分钟，这一轮必须什么都不抓——否则发布频率直接变成账单倍数。
   */
  it("发布重启后的那一轮不重抓", () => {
    expect(isFeedDue(minutesAgo(0.3), NOW, INTERVAL_MS)).toBe(false);
  });

  /**
   * 定时器与库里的时间戳总有漂移。差一点点就判「没到点」会把每一轮都推到
   * 下一次心跳，15 分钟的周期实际跑成 30 分钟。
   */
  it("早到一点仍算到点，周期不会被推成两倍", () => {
    expect(isFeedDue(minutesAgo(14.9), NOW, INTERVAL_MS)).toBe(true);
  });
});

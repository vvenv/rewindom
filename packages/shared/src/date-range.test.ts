import { describe, it, expect } from "vitest";

import { getCalendarRange } from "./date-range.js";

describe("getCalendarRange", () => {
  it("今日范围为日历今日 00:00:00 至 23:59:59", () => {
    const now = new Date("2026-06-05T15:30:00+08:00");
    const range = getCalendarRange("today", now);
    expect(range).toEqual({
      start: "2026-06-05 00:00:00",
      end: "2026-06-05 23:59:59",
    });
  });

  it("昨日范围为日历昨日 00:00:00 至 23:59:59", () => {
    const now = new Date("2026-06-05T15:30:00+08:00");
    const range = getCalendarRange("yesterday", now);
    expect(range).toEqual({
      start: "2026-06-04 00:00:00",
      end: "2026-06-04 23:59:59",
    });
  });

  it("最近一周为含今日共 7 个自然日", () => {
    const now = new Date("2026-06-05T15:30:00+08:00");
    const range = getCalendarRange("last_7_days", now);
    expect(range).toEqual({
      start: "2026-05-30 00:00:00",
      end: "2026-06-05 23:59:59",
    });
  });

  it("uses Asia/Shanghai calendar when host timezone is UTC", () => {
    const now = new Date("2026-06-05T07:30:00.000Z");
    expect(getCalendarRange("today", now)).toEqual({
      start: "2026-06-05 00:00:00",
      end: "2026-06-05 23:59:59",
    });
    expect(getCalendarRange("yesterday", now)).toEqual({
      start: "2026-06-04 00:00:00",
      end: "2026-06-04 23:59:59",
    });
    expect(getCalendarRange("last_7_days", now)).toEqual({
      start: "2026-05-30 00:00:00",
      end: "2026-06-05 23:59:59",
    });
  });
});

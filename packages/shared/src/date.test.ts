import { startOfDay, subDays } from "date-fns";
import { describe, it, expect, vi } from "vitest";

import {
  toBusinessDateString,
  endOfBusinessDay,
  formatBusinessDateRange,
  formatBusinessDate,
  formatBusinessDateOrTimeAgo,
  getZonedHour,
  getZonedTimeParts,
  toBusinessTimezone,
  toNullableBusinessDate,
} from "./date";
import { EMPTY_DISPLAY } from "./display";

describe("formatBusinessDate", () => {
  it("should format ISO string to default format", () => {
    const result = formatBusinessDate("2024-01-15T10:30:00Z");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it("should format Date object", () => {
    const date = new Date("2024-01-15T10:30:00Z");
    const result = formatBusinessDate(date);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it("should format timestamp number", () => {
    const timestamp = new Date("2024-01-15T10:30:00Z").getTime();
    const result = formatBusinessDate(timestamp);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it("should use custom format string", () => {
    const result = formatBusinessDate("2024-01-15T10:30:00Z", "yyyy-MM-dd");
    expect(result).toBe("2024-01-15");
  });

  it("should handle different custom format", () => {
    const result = formatBusinessDate("2024-01-15T10:30:00Z", "HH:mm:ss");
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it("should return EMPTY_DISPLAY for invalid date", () => {
    const result = formatBusinessDate("invalid");
    expect(result).toBe(EMPTY_DISPLAY);
  });
});

describe("formatBusinessDateOrTimeAgo", () => {
  it("shows relative time for recent dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-05T12:00:00Z"));

    const result = formatBusinessDateOrTimeAgo("2026-06-05T11:55:00Z");
    expect(result).toBe("5 分钟前");

    vi.useRealTimers();
  });

  it("shows absolute format for older dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-05T12:00:00Z"));

    const older = "2026-06-03T12:00:00Z";
    expect(formatBusinessDateOrTimeAgo(older)).toBe(formatBusinessDate(older));

    vi.useRealTimers();
  });

  it("returns EMPTY_DISPLAY for invalid date", () => {
    expect(formatBusinessDateOrTimeAgo("invalid")).toBe(EMPTY_DISPLAY);
  });
});

describe("toBusinessTimezone", () => {
  it("supports calendar math in BUSINESS_TIMEZONE when host is UTC", () => {
    const instant = new Date("2026-06-05T07:30:00.000Z");
    const zoned = toBusinessTimezone(instant);
    expect(toBusinessDateString(startOfDay(zoned))).toBe("2026-06-05 00:00:00");
  });

  it("uses business calendar date near UTC midnight", () => {
    const instant = new Date("2026-06-04T16:00:00.000Z");
    expect(toBusinessDateString(startOfDay(toBusinessTimezone(instant)))).toBe(
      "2026-06-05 00:00:00",
    );
  });
});

describe("endOfBusinessDay", () => {
  it("returns 23:59:59 on the same business calendar day", () => {
    const day = startOfDay(
      subDays(toBusinessTimezone(new Date("2026-06-05T07:30:00.000Z")), 1),
    );
    expect(toBusinessDateString(endOfBusinessDay(day))).toBe(
      "2026-06-04 23:59:59",
    );
  });
});

describe("toBusinessDateString", () => {
  it("serializes zoned wall start and end of day", () => {
    const day = startOfDay(
      subDays(toBusinessTimezone(new Date("2026-06-05T15:30:00+08:00")), 1),
    );
    expect(toBusinessDateString(day)).toBe("2026-06-04 00:00:00");
    expect(toBusinessDateString(endOfBusinessDay(day))).toBe(
      "2026-06-04 23:59:59",
    );
  });
});

describe("toNullableBusinessDate", () => {
  it("returns null for empty or missing values", () => {
    expect(toNullableBusinessDate(null)).toBeNull();
    expect(toNullableBusinessDate(undefined)).toBeNull();
    expect(toNullableBusinessDate("")).toBeNull();
    expect(toNullableBusinessDate("   ")).toBeNull();
  });

  it("returns null for invalid date input", () => {
    expect(toNullableBusinessDate("invalid")).toBeNull();
    expect(toNullableBusinessDate(new Date("invalid"))).toBeNull();
  });

  it("parses valid business wall-clock strings", () => {
    const parsed = toNullableBusinessDate("2026-06-01 12:00:00");
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed && Number.isNaN(parsed.getTime())).toBe(false);
  });
});

describe("getZonedTimeParts", () => {
  it("returns hour, minute, and second in business timezone", () => {
    expect(getZonedTimeParts(new Date("2024-06-13T09:30:45+08:00"))).toEqual({
      hour: 9,
      minute: 30,
      second: 45,
    });
  });
});

describe("getZonedHour", () => {
  it("returns hour in business timezone", () => {
    expect(getZonedHour(new Date("2024-06-13T09:30:00+08:00"))).toBe(9);
  });
});

describe("formatBusinessDateRange", () => {
  it("formats naive start and end for API filters", () => {
    const zonedNow = toBusinessTimezone(new Date("2026-06-05T07:30:00.000Z"));
    const day = subDays(zonedNow, 1);
    expect(
      formatBusinessDateRange(startOfDay(day), endOfBusinessDay(day)),
    ).toEqual({
      start: "2026-06-04 00:00:00",
      end: "2026-06-04 23:59:59",
    });
  });
});

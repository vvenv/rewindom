import { describe, expect, it } from "vitest";

import { formatPickerRangeLabel, parseOptionalDate } from "./calendar-range.js";

function zoned(iso: string): Date {
  return new Date(iso);
}

describe("formatPickerRangeLabel", () => {
  it("shows date only for single day in dateOnly mode", () => {
    const day = zoned("2025-06-27T12:00:00+08:00");
    expect(formatPickerRangeLabel(day, day, { dateOnly: true })).toBe(
      "2025-06-27",
    );
  });

  it("shows date range in dateOnly mode", () => {
    const from = zoned("2025-06-01T00:00:00+08:00");
    const to = zoned("2025-06-27T23:59:59+08:00");
    expect(formatPickerRangeLabel(from, to, { dateOnly: true })).toBe(
      "2025-06-01 - 2025-06-27",
    );
  });

  it("omits end date when same calendar day", () => {
    const from = zoned("2025-06-27T09:00:00+08:00");
    const to = zoned("2025-06-27T18:30:00+08:00");
    expect(formatPickerRangeLabel(from, to)).toBe(
      "2025-06-27 09:00:00 - 18:30:00",
    );
  });

  it("shows date only for whole-day cross-day ranges", () => {
    const from = zoned("2025-06-01T00:00:00+08:00");
    const to = zoned("2025-06-27T23:59:59+08:00");
    expect(formatPickerRangeLabel(from, to)).toBe("2025-06-01 - 2025-06-27");
  });

  it("omits end year when same calendar year", () => {
    const from = zoned("2025-06-01T09:00:00+08:00");
    const to = zoned("2025-06-27T18:30:00+08:00");
    expect(formatPickerRangeLabel(from, to)).toBe(
      "2025-06-01 09:00:00 - 06-27 18:30:00",
    );
  });

  it("shows full dates when crossing years", () => {
    const from = zoned("2024-12-31T09:00:00+08:00");
    const to = zoned("2025-01-01T18:30:00+08:00");
    expect(formatPickerRangeLabel(from, to)).toBe(
      "2024-12-31 09:00:00 - 2025-01-01 18:30:00",
    );
  });
});

describe("parseOptionalDate", () => {
  it("empty / null returns undefined", () => {
    expect(parseOptionalDate("")).toBeUndefined();
    expect(parseOptionalDate("   ")).toBeUndefined();
    expect(parseOptionalDate(null)).toBeUndefined();
    expect(parseOptionalDate(undefined)).toBeUndefined();
  });

  it("invalid date returns undefined", () => {
    expect(parseOptionalDate("not-a-date")).toBeUndefined();
  });

  it("ISO string parses to Date", () => {
    const date = parseOptionalDate("2026-08-07T15:30:00.000Z");
    expect(date).toBeInstanceOf(Date);
    expect(date?.toISOString()).toBe("2026-08-07T15:30:00.000Z");
  });

  it("passes through a valid Date", () => {
    const original = new Date("2026-08-07T15:30:00.000Z");
    expect(parseOptionalDate(original)).toBe(original);
  });
});

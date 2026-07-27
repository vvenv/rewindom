import { describe, expect, it } from "vitest";

import {
  parseFilterDateTime,
  parseFilterDateTimeIso,
} from "./business-datetime.js";

describe("parseFilterDateTime", () => {
  it("interprets naive datetime as Asia/Shanghai wall time", () => {
    const start = parseFilterDateTime("2026-06-03 00:00:00", "start");
    const end = parseFilterDateTime("2026-06-03 23:59:59", "end");
    expect(start.toISOString()).toBe("2026-06-02T16:00:00.000Z");
    expect(end.toISOString()).toBe("2026-06-03T15:59:59.000Z");
  });

  it("interprets date-only as Shanghai calendar day bounds", () => {
    const start = parseFilterDateTime("2026-06-03", "start");
    const end = parseFilterDateTime("2026-06-03", "end");
    expect(start.toISOString()).toBe("2026-06-02T16:00:00.000Z");
    expect(end.toISOString()).toBe("2026-06-03T15:59:59.999Z");
  });

  it("preserves explicit offset", () => {
    const d = parseFilterDateTime("2026-06-03T00:00:00+08:00", "start");
    expect(d.toISOString()).toBe("2026-06-02T16:00:00.000Z");
  });

  it("preserves UTC Z offset", () => {
    const d = parseFilterDateTime("2026-06-03T00:00:00Z", "start");
    expect(d.toISOString()).toBe("2026-06-03T00:00:00.000Z");
  });

  it("parses naive datetime with T separator as Shanghai wall time", () => {
    const d = parseFilterDateTime("2026-06-03T08:30:00", "start");
    expect(d.toISOString()).toBe("2026-06-03T00:30:00.000Z");
  });

  it("treats ambiguous string without T or date pattern as Shanghai wall midnight", () => {
    const start = parseFilterDateTime("2026-06-03", "start");
    const end = parseFilterDateTime("2026-06-03", "end");
    expect(start.toISOString()).toBe("2026-06-02T16:00:00.000Z");
    expect(end.toISOString()).toBe("2026-06-03T15:59:59.999Z");
  });
});

describe("parseFilterDateTimeIso", () => {
  it("returns ISO string for naive datetime", () => {
    const iso = parseFilterDateTimeIso("2026-06-03 00:00:00", "start");
    expect(iso).toBe("2026-06-02T16:00:00.000Z");
  });

  it("defaults to start boundary", () => {
    const iso = parseFilterDateTimeIso("2026-06-03");
    expect(iso).toBe("2026-06-02T16:00:00.000Z");
  });
});

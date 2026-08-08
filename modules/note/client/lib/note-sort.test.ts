import { describe, expect, it } from "vitest";

import {
  DEFAULT_NOTE_SORT_VALUE,
  fromNoteSortValue,
  NOTE_SORT_OPTIONS,
  toNoteSortValue,
} from "./note-sort.js";

describe("toNoteSortValue", () => {
  it("falls back to default when field missing", () => {
    expect(toNoteSortValue(undefined, undefined)).toBe(DEFAULT_NOTE_SORT_VALUE);
  });

  it("falls back to default for fields outside the server whitelist", () => {
    expect(toNoteSortValue("content", "asc")).toBe(DEFAULT_NOTE_SORT_VALUE);
  });

  it("defaults direction to desc, matching the server", () => {
    expect(toNoteSortValue("title", undefined)).toBe("title:desc");
    expect(toNoteSortValue("title", "bogus")).toBe("title:desc");
  });

  it("keeps a valid field and direction", () => {
    expect(toNoteSortValue("created_at", "asc")).toBe("created_at:asc");
  });
});

describe("fromNoteSortValue", () => {
  it("parses each offered option", () => {
    for (const option of NOTE_SORT_OPTIONS) {
      const { sortBy, sortDir } = fromNoteSortValue(option.value);
      expect(`${sortBy}:${sortDir}`).toBe(option.value);
    }
  });

  it("falls back to default sort for unknown values", () => {
    expect(fromNoteSortValue("content:asc")).toEqual({
      sortBy: "updated_at",
      sortDir: "desc",
    });
  });
});

describe("NOTE_SORT_OPTIONS", () => {
  it("round-trips through the URL representation", () => {
    for (const option of NOTE_SORT_OPTIONS) {
      const { sortBy, sortDir } = fromNoteSortValue(option.value);
      expect(toNoteSortValue(sortBy, sortDir)).toBe(option.value);
    }
  });
});

import { describe, expect, it } from "vitest";

import { parseSortDir, resolveSortField, resolveSortOrder } from "./list-sort.js";

describe("list-sort", () => {
  it("parseSortDir accepts asc and desc only", () => {
    expect(parseSortDir("asc")).toBe("asc");
    expect(parseSortDir("desc")).toBe("desc");
    expect(parseSortDir("invalid")).toBeUndefined();
  });

  it("resolveSortField falls back for unknown fields", () => {
    const allowed = new Set(["created_at"]);
    expect(resolveSortField("created_at", allowed, "created_at")).toBe(
      "created_at",
    );
    expect(resolveSortField("unknown", allowed, "created_at")).toBe(
      "created_at",
    );
  });

  it("resolveSortOrder falls back when sort dir missing", () => {
    expect(resolveSortOrder(undefined, "desc")).toBe("desc");
    expect(resolveSortOrder("asc", "desc")).toBe("asc");
  });
});

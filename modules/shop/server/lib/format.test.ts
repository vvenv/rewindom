import { describe, expect, it } from "vitest";

import { normalizeCountry, normalizeHsCode, SLUG_RE } from "./format.js";

describe("format helpers", () => {
  it("normalizes country and HS code", () => {
    expect(normalizeCountry("us")).toBe("US");
    expect(normalizeCountry("USA")).toBeNull();
    expect(normalizeHsCode("0901 21")).toBe("090121");
    expect(normalizeHsCode("12")).toBeNull();
  });

  it("accepts kebab slugs", () => {
    expect(SLUG_RE.test("coffee-mug")).toBe(true);
    expect(SLUG_RE.test("Coffee")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import {
  categoryKeyFromLabel,
  compareDocCategories,
  parseCreateCategoryBody,
  validateCategoryKey,
} from "./marketing-doc-category.js";

describe("validateCategoryKey", () => {
  it("normalizes to lowercase", () => {
    expect(validateCategoryKey("Getting-Started")).toBe("getting-started");
  });

  it("rejects invalid keys", () => {
    expect(() => validateCategoryKey("入门")).toThrow("site.doc_category_key_invalid");
    expect(() => validateCategoryKey("-bad")).toThrow("site.doc_category_key_invalid");
  });
});

describe("compareDocCategories", () => {
  it("orders by sort_order then key", () => {
    expect(
      compareDocCategories(
        { sort_order: 1, key: "b" },
        { sort_order: 0, key: "a" },
      ),
    ).toBeGreaterThan(0);
    expect(
      compareDocCategories(
        { sort_order: 0, key: "a" },
        { sort_order: 0, key: "b" },
      ),
    ).toBeLessThan(0);
  });
});

describe("categoryKeyFromLabel", () => {
  it("slugifies latin labels", () => {
    expect(categoryKeyFromLabel("Getting Started")).toBe("getting-started");
  });

  it("falls back to hash for non-latin labels", () => {
    expect(categoryKeyFromLabel("入门")).toMatch(/^cat-[a-z0-9]+$/u);
  });
});

describe("parseCreateCategoryBody", () => {
  it("requires a non-empty label", () => {
    expect(() =>
      parseCreateCategoryBody({ key: "guides", label: "   " }),
    ).toThrow("site.doc_category_label_required");
  });

  it("defaults sort_order to zero", () => {
    expect(
      parseCreateCategoryBody({ key: "guides", label: "Guides" }),
    ).toEqual({
      key: "guides",
      label: "Guides",
      sort_order: 0,
    });
  });
});

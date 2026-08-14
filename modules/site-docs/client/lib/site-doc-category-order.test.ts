import { describe, expect, it } from "vitest";

import type { SiteDocCategory } from "../../shared/site-doc-category.js";

import { canMoveDocCategory, moveDocCategory } from "./site-doc-category-order.js";

function category(
  id: string,
  key: string,
  sort_order: number,
): SiteDocCategory {
  return {
    id,
    tenant_id: "t1",
    key,
    label: key,
    sort_order,
    created_at: "",
    updated_at: "",
  };
}

describe("moveDocCategory", () => {
  it("renumbers sort_order when moving adjacent items", () => {
    const items = [
      category("a", "alpha", 0),
      category("b", "beta", 0),
      category("c", "gamma", 0),
    ];

    expect(moveDocCategory(items, 0, 1)).toEqual([
      { id: "a", sort_order: 1 },
      { id: "c", sort_order: 2 },
    ]);
  });

  it("returns empty writes when move is out of range", () => {
    const items = [category("a", "alpha", 0), category("b", "beta", 1)];
    expect(moveDocCategory(items, 0, -1)).toEqual([]);
    expect(moveDocCategory(items, 1, 1)).toEqual([]);
  });
});

describe("canMoveDocCategory", () => {
  it("disables move at edges", () => {
    const items = [category("a", "alpha", 0), category("b", "beta", 1)];
    expect(canMoveDocCategory(items, 0, -1)).toBe(false);
    expect(canMoveDocCategory(items, 0, 1)).toBe(true);
    expect(canMoveDocCategory(items, 1, 1)).toBe(false);
  });
});

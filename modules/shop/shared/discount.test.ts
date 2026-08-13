import { describe, expect, it } from "vitest";

import {
  normalizeDiscountCode,
  quoteDiscount,
  type ShopDiscountQuoteInput,
} from "./discount.js";

const now = new Date("2026-06-01T12:00:00.000Z");

function discount(
  overrides: Partial<ShopDiscountQuoteInput> = {},
): ShopDiscountQuoteInput {
  return {
    type: "percent",
    value: 10,
    min_subtotal_cents: 0,
    max_uses: null,
    used_count: 0,
    starts_at: null,
    ends_at: null,
    status: "active",
    ...overrides,
  };
}

describe("normalizeDiscountCode", () => {
  it("uppercases a valid code", () => {
    expect(normalizeDiscountCode(" save-10 ")).toBe("SAVE-10");
  });

  it("rejects empty or illegal codes", () => {
    expect(normalizeDiscountCode("")).toBeNull();
    expect(normalizeDiscountCode("a")).toBeNull();
    expect(normalizeDiscountCode("SAVE 10")).toBeNull();
  });
});

describe("quoteDiscount", () => {
  it("takes a percent of the merchandise subtotal", () => {
    expect(quoteDiscount(discount({ type: "percent", value: 10 }), 1999, now)).toEqual({
      ok: true,
      discount_cents: 199,
    });
  });

  it("caps a fixed amount at the subtotal", () => {
    expect(quoteDiscount(discount({ type: "fixed", value: 500 }), 300, now)).toEqual({
      ok: true,
      discount_cents: 300,
    });
  });

  it("rejects inactive, expired, unused-up, or below-minimum codes", () => {
    expect(quoteDiscount(discount({ status: "draft" }), 2000, now).ok).toBe(false);
    expect(
      quoteDiscount(discount({ ends_at: "2026-01-01T00:00:00.000Z" }), 2000, now)
        .ok,
    ).toBe(false);
    expect(
      quoteDiscount(discount({ starts_at: "2026-12-01T00:00:00.000Z" }), 2000, now)
        .ok,
    ).toBe(false);
    expect(
      quoteDiscount(discount({ max_uses: 5, used_count: 5 }), 2000, now).ok,
    ).toBe(false);
    expect(
      quoteDiscount(discount({ min_subtotal_cents: 5000 }), 2000, now).ok,
    ).toBe(false);
  });

  it("does not use shipping as the discount base", () => {
    expect(quoteDiscount(discount({ type: "fixed", value: 100 }), 1000, now)).toEqual({
      ok: true,
      discount_cents: 100,
    });
  });
});

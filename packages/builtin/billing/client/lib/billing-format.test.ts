import { describe, expect, it } from "vitest";

import { formatAmountCents, formatBillingDate } from "./billing-format.js";

describe("billing-format", () => {
  it("formats amount cents", () => {
    expect(formatAmountCents(9900, "CNY")).toContain("99");
  });

  it("formats billing date", () => {
    expect(formatBillingDate(null)).toBe("—");
    expect(formatBillingDate("invalid")).toBe("invalid");
  });
});

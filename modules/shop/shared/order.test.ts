import { describe, expect, it } from "vitest";

import {
  isShopOrderRefundable,
  SHOP_ORDER_STATUSES,
  SHOP_REFUNDABLE_STATUSES,
} from "./order.js";

describe("isShopOrderRefundable", () => {
  it("allows paid through completed", () => {
    expect([...SHOP_REFUNDABLE_STATUSES]).toEqual([
      "paid",
      "fulfilling",
      "shipped",
      "completed",
    ]);
    for (const status of SHOP_REFUNDABLE_STATUSES) {
      expect(isShopOrderRefundable(status)).toBe(true);
    }
  });

  it("rejects unpaid, cancelled, and already refunded", () => {
    expect(isShopOrderRefundable("pending_payment")).toBe(false);
    expect(isShopOrderRefundable("cancelled")).toBe(false);
    expect(isShopOrderRefundable("refunded")).toBe(false);
    expect(SHOP_ORDER_STATUSES).toContain("refunded");
  });
});

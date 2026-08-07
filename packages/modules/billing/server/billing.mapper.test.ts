import { describe, it, expect } from "vitest";

import { toBillingPayment, toBillingSubscription } from "./billing.mapper.js";

function makeSubscriptionRow(overrides: Partial<Parameters<typeof toBillingSubscription>[0]> = {}) {
  return {
    id: "sub-1",
    tenant_id: "tenant-a",
    plan_slug: "pro",
    status: "active",
    provider: "creem",
    provider_subscription_id: "ps-1",
    provider_customer_id: "pc-1",
    current_period_start: new Date("2026-01-01T00:00:00.000Z"),
    current_period_end: new Date("2026-02-01T00:00:00.000Z"),
    cancel_at_period_end: false,
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  };
}

function makePaymentRow(overrides: Partial<Parameters<typeof toBillingPayment>[0]> = {}) {
  return {
    id: "pay-1",
    tenant_id: "tenant-a",
    subscription_id: "sub-1",
    plan_slug: "pro",
    provider: "creem",
    provider_order_id: "po-1",
    amount_cents: 9900,
    currency: "USD",
    status: "paid",
    paid_at: new Date("2026-01-01T00:00:00.000Z"),
    description: "Pro plan",
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  };
}

describe("billing.mapper", () => {
  describe("toBillingSubscription", () => {
    it("Date 字段转 ISO 字符串", () => {
      const dto = toBillingSubscription(makeSubscriptionRow());
      expect(dto.current_period_start).toBe("2026-01-01T00:00:00.000Z");
      expect(dto.current_period_end).toBe("2026-02-01T00:00:00.000Z");
      expect(dto.created_at).toBe("2026-01-01T00:00:00.000Z");
      expect(dto.updated_at).toBe("2026-01-02T00:00:00.000Z");
    });

    it("null 日期字段转 null", () => {
      const dto = toBillingSubscription(
        makeSubscriptionRow({
          current_period_start: null,
          current_period_end: null,
          provider_customer_id: null,
        }),
      );
      expect(dto.current_period_start).toBeNull();
      expect(dto.current_period_end).toBeNull();
      expect(dto.provider_customer_id).toBeNull();
    });

    it("status 原样透传(类型断言)", () => {
      const dto = toBillingSubscription(makeSubscriptionRow({ status: "trialing" }));
      expect(dto.status).toBe("trialing");
    });

    it("cancel_at_period_end 布尔透传", () => {
      expect(
        toBillingSubscription(makeSubscriptionRow({ cancel_at_period_end: true }))
          .cancel_at_period_end,
      ).toBe(true);
      expect(
        toBillingSubscription(makeSubscriptionRow({ cancel_at_period_end: false }))
          .cancel_at_period_end,
      ).toBe(false);
    });

    it("字符串字段原样透传", () => {
      const dto = toBillingSubscription(makeSubscriptionRow());
      expect(dto.id).toBe("sub-1");
      expect(dto.tenant_id).toBe("tenant-a");
      expect(dto.plan_slug).toBe("pro");
      expect(dto.provider).toBe("creem");
      expect(dto.provider_subscription_id).toBe("ps-1");
    });
  });

  describe("toBillingPayment", () => {
    it("Date 字段转 ISO 字符串", () => {
      const dto = toBillingPayment(makePaymentRow());
      expect(dto.paid_at).toBe("2026-01-01T00:00:00.000Z");
      expect(dto.created_at).toBe("2026-01-01T00:00:00.000Z");
      expect(dto.updated_at).toBe("2026-01-02T00:00:00.000Z");
    });

    it("null paid_at 转 null", () => {
      expect(
        toBillingPayment(makePaymentRow({ paid_at: null })).paid_at,
      ).toBeNull();
    });

    it("null subscription_id / plan_slug / description 透传", () => {
      const dto = toBillingPayment(
        makePaymentRow({
          subscription_id: null,
          plan_slug: null,
          description: null,
        }),
      );
      expect(dto.subscription_id).toBeNull();
      expect(dto.plan_slug).toBeNull();
      expect(dto.description).toBeNull();
    });

    it("amount_cents / currency 透传", () => {
      const dto = toBillingPayment(
        makePaymentRow({ amount_cents: 19900, currency: "CNY" }),
      );
      expect(dto.amount_cents).toBe(19900);
      expect(dto.currency).toBe("CNY");
    });

    it("status 原样透传", () => {
      expect(
        toBillingPayment(makePaymentRow({ status: "refunded" })).status,
      ).toBe("refunded");
    });
  });
});

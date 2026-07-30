import { createHmac } from "node:crypto";

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@be-water/server-kernel/lib/config.js", () => ({
  config: {
    billing: {
      creem: {
        apiKey: "test_key",
        webhookSecret: "whsec_test",
        storeId: "sto_test",
        server: "test",
        productMap: {},
      },
    },
  },
}));

const findFirstSubscription = vi.fn();
const createSubscription = vi.fn();
const updateSubscription = vi.fn();
const findFirstPayment = vi.fn();
const createPayment = vi.fn();
const updatePayment = vi.fn();

vi.mock("@be-water/server-kernel/lib/prisma.js", () => ({
  prisma: {
    subscription: {
      findFirst: (...args: unknown[]) => findFirstSubscription(...args),
      create: (...args: unknown[]) => createSubscription(...args),
      update: (...args: unknown[]) => updateSubscription(...args),
    },
    payment: {
      findFirst: (...args: unknown[]) => findFirstPayment(...args),
      create: (...args: unknown[]) => createPayment(...args),
      update: (...args: unknown[]) => updatePayment(...args),
    },
  },
}));

const applyGrantedPlan = vi.fn();
const revokeToFreePlan = vi.fn();

vi.mock("./billing.service.js", () => ({
  applyGrantedPlan: (...args: unknown[]) => applyGrantedPlan(...args),
  revokeToFreePlan: (...args: unknown[]) => revokeToFreePlan(...args),
}));

describe("billing webhook", () => {
  beforeEach(() => {
    findFirstSubscription.mockReset();
    createSubscription.mockReset();
    updateSubscription.mockReset();
    findFirstPayment.mockReset();
    createPayment.mockReset();
    updatePayment.mockReset();
    applyGrantedPlan.mockReset();
    revokeToFreePlan.mockReset();
  });

  it("verifies signature and grants plan on subscription.paid", async () => {
    const payload = JSON.stringify({
      id: "evt_1",
      eventType: "subscription.paid",
      object: {
        id: "sub_abc",
        status: "active",
        customer: { id: "cus_1" },
        metadata: { tenant_id: "tenant-1", plan_slug: "starter" },
        order: {
          id: "ord_1",
          amount: 9900,
          currency: "CNY",
        },
      },
    });
    const signature = createHmac("sha256", "whsec_test")
      .update(payload)
      .digest("hex");

    findFirstSubscription.mockResolvedValueOnce(null);
    createSubscription.mockResolvedValueOnce({ id: "local-sub-1" });
    findFirstPayment.mockResolvedValueOnce(null);
    createPayment.mockResolvedValueOnce({});
    applyGrantedPlan.mockResolvedValueOnce(undefined);

    const { verifyAndParseCreemWebhook, handleCreemWebhookEvent } =
      await import("./billing-webhook.service.js");

    const event = await verifyAndParseCreemWebhook(payload, {
      "creem-signature": signature,
    });
    const result = await handleCreemWebhookEvent(event);

    expect(result.handled).toBe(true);
    expect(applyGrantedPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: "tenant-1",
        plan_slug: "starter",
      }),
    );
    expect(createSubscription).toHaveBeenCalled();
    expect(createPayment).toHaveBeenCalled();
  });
});

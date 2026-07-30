import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@be-water/server-kernel/lib/config.js", () => ({
  config: {
    billing: {
      creem: {
        apiKey: "test_key",
        webhookSecret: "whsec_test",
        storeId: "sto_1xa3pu52PWClO5EruTHs86",
        server: "test",
        productMap: { starter: "prod_starter", pro: "prod_pro" },
      },
    },
    frontend: { url: "http://localhost:7300" },
  },
}));

const createCheckout = vi.fn();
const cancelSubscription = vi.fn();

vi.mock("creem", () => ({
  Creem: class {
    checkouts = { create: createCheckout };
    subscriptions = { cancel: cancelSubscription };
  },
}));

describe("CreemProvider", () => {
  beforeEach(() => {
    createCheckout.mockReset();
    cancelSubscription.mockReset();
  });

  it("creates checkout and returns checkout_url", async () => {
    createCheckout.mockResolvedValueOnce({
      id: "ch_1",
      checkoutUrl: "https://creem.test/checkout",
    });

    const { CreemProvider } = await import("./creem.provider.js");
    const provider = new CreemProvider();
    const result = await provider.createCheckout({
      product_id: "prod_starter",
      success_url: "http://localhost:7300/billing",
      metadata: { tenant_id: "t1", plan_slug: "starter" },
    });

    expect(result.checkout_url).toBe("https://creem.test/checkout");
    expect(createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ productId: "prod_starter" }),
    );
  });

  it("rejects non-prod_ product ids before calling Creem", async () => {
    const { CreemProvider } = await import("./creem.provider.js");
    const provider = new CreemProvider();
    await expect(
      provider.createCheckout({
        product_id: "starter",
        success_url: "http://localhost:7300/billing",
        metadata: { tenant_id: "t1", plan_slug: "starter" },
      }),
    ).rejects.toThrow(/product_id 无效/);
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("cancels subscription in scheduled mode", async () => {
    cancelSubscription.mockResolvedValueOnce({
      id: "sub_1",
      status: "active",
    });

    const { CreemProvider } = await import("./creem.provider.js");
    const provider = new CreemProvider();
    const result = await provider.cancelSubscription({
      provider_subscription_id: "sub_1",
      mode: "scheduled",
    });

    expect(result.cancel_at_period_end).toBe(true);
    expect(cancelSubscription).toHaveBeenCalledWith("sub_1", {
      mode: "scheduled",
      onExecute: "cancel",
    });
  });
});

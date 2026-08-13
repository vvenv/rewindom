import { createHmac } from "node:crypto";

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@rewindom/server-kernel/lib/config.js", () => ({
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
const upsertSubscription = vi.fn();
const updateSubscription = vi.fn();
const upsertPayment = vi.fn();

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
  prisma: {
    subscription: {
      findFirst: (...args: unknown[]) => findFirstSubscription(...args),
      upsert: (...args: unknown[]) => upsertSubscription(...args),
      update: (...args: unknown[]) => updateSubscription(...args),
    },
    payment: {
      upsert: (...args: unknown[]) => upsertPayment(...args),
    },
  },
}));

const applyGrantedPlan = vi.fn();
const reconcileTenantPlan = vi.fn();

vi.mock("./billing.service.js", () => ({
  applyGrantedPlan: (...args: unknown[]) => applyGrantedPlan(...args),
  reconcileTenantPlan: (...args: unknown[]) => reconcileTenantPlan(...args),
}));

function signedEvent(body: Record<string, unknown>): {
  payload: string;
  signature: string;
} {
  const payload = JSON.stringify(body);
  return {
    payload,
    signature: createHmac("sha256", "whsec_test").update(payload).digest("hex"),
  };
}

const PAID_EVENT = {
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
};

async function deliver(body: Record<string, unknown>) {
  const { payload, signature } = signedEvent(body);
  const { verifyAndParseCreemWebhook, handleCreemWebhookEvent } = await import(
    "./billing-webhook.service.js"
  );
  const event = await verifyAndParseCreemWebhook(payload, {
    "creem-signature": signature,
  });
  return handleCreemWebhookEvent(event);
}

describe("billing webhook", () => {
  beforeEach(() => {
    findFirstSubscription.mockReset();
    upsertSubscription.mockReset();
    updateSubscription.mockReset();
    upsertPayment.mockReset();
    applyGrantedPlan.mockReset();
    reconcileTenantPlan.mockReset();
  });

  it("verifies signature and grants plan on subscription.paid", async () => {
    upsertSubscription.mockResolvedValue({ id: "local-sub-1" });
    upsertPayment.mockResolvedValue({});

    const result = await deliver(PAID_EVENT);

    expect(result.handled).toBe(true);
    expect(applyGrantedPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: "tenant-1",
        plan_slug: "starter",
      }),
    );
    expect(upsertSubscription).toHaveBeenCalled();
    expect(upsertPayment).toHaveBeenCalled();
  });

  /*
   * 重投是 webhook 的常态（网络抖动、通道重试）。用 upsert 之后同一个事件投几次
   * 都只落一行；先查再建的写法在这里会撞唯一键，把重试变成一场循环。
   */
  it("落库按唯一键 upsert，重投同一个事件不重复建行", async () => {
    upsertSubscription.mockResolvedValue({ id: "local-sub-1" });
    upsertPayment.mockResolvedValue({});

    await deliver(PAID_EVENT);
    await deliver(PAID_EVENT);

    expect(upsertSubscription).toHaveBeenCalledTimes(2);
    for (const [args] of upsertSubscription.mock.calls) {
      expect(args.where).toEqual({
        tenant_id_provider_provider_subscription_id: {
          tenant_id: "tenant-1",
          provider: "creem",
          provider_subscription_id: "sub_abc",
        },
      });
    }
    for (const [args] of upsertPayment.mock.calls) {
      expect(args.where).toEqual({
        tenant_id_provider_provider_order_id: {
          tenant_id: "tenant-1",
          provider: "creem",
          provider_order_id: "ord_1",
        },
      });
    }
  });

  /*
   * 升档时旧订阅会在通道侧被取消。以前这里是无条件降到 free，付完钱的组织当场失权；
   * 现在只把那条订阅置终态，套餐交给 `reconcileTenantPlan` 按剩下的订阅重算。
   */
  it("订阅取消只置终态，套餐交给 reconcile 重算", async () => {
    findFirstSubscription.mockResolvedValueOnce({
      id: "local-sub-old",
      cancel_at_period_end: false,
      current_period_end: null,
    });
    updateSubscription.mockResolvedValueOnce({});

    const result = await deliver({
      id: "evt_2",
      eventType: "subscription.canceled",
      object: {
        id: "sub_old",
        status: "canceled",
        metadata: { tenant_id: "tenant-1", plan_slug: "starter" },
      },
    });

    expect(result.handled).toBe(true);
    expect(updateSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "canceled" }),
      }),
    );
    expect(reconcileTenantPlan).toHaveBeenCalledWith("tenant-1");
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

const resolveCredentials = vi.fn();

vi.mock("./provider-credentials.js", () => ({
  resolveSiteBillingCreem: (...args: unknown[]) => resolveCredentials(...args),
}));

const findFirstSubscription = vi.fn();
const upsertSubscription = vi.fn();
const updateSubscription = vi.fn();
const upsertPayment = vi.fn();
const findFirstPlan = vi.fn();

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
  prisma: {
    memberSubscription: {
      findFirst: (...a: unknown[]) => findFirstSubscription(...a),
      upsert: (...a: unknown[]) => upsertSubscription(...a),
      update: (...a: unknown[]) => updateSubscription(...a),
    },
    memberPayment: { upsert: (...a: unknown[]) => upsertPayment(...a) },
    memberPlan: { findFirst: (...a: unknown[]) => findFirstPlan(...a) },
  },
}));

const GRANT_EVENT = {
  id: "evt_1",
  type: "subscription.paid",
  raw: {},
  data: {
    object: {
      id: "sub_1",
      status: "active",
      customer: { id: "cus_1" },
      metadata: {
        tenant_id: "tenant-1",
        member_id: "member-1",
        plan_slug: "basic",
      },
      order: { id: "ord_1", amount: 2900, currency: "CNY" },
    },
  },
} as never;

describe("peekTenantId", () => {
  beforeEach(() => {
    resolveCredentials.mockReset();
  });

  /*
   * 这一步读的是**未验签**的报文，只为查密钥。它必须对任意垃圾输入都返回 null 而不是抛，
   * 否则公网上随便一个 POST 就能把这条路由打成 500。
   */
  it("从 metadata 里取出 tenant_id", async () => {
    const { peekTenantId } = await import("./site-billing-webhook.service.js");
    expect(
      peekTenantId(
        JSON.stringify({ data: { metadata: { tenant_id: "tenant-9" } } }),
      ),
    ).toBe("tenant-9");
  });

  it.each([
    ["非 JSON", "not json at all"],
    ["JSON 数组", "[1,2,3]"],
    ["没有 metadata", '{"data":{}}'],
    ["tenant_id 不是字符串", '{"data":{"metadata":{"tenant_id":42}}}'],
  ])("%s 时返回 null 而不是抛", async (_label, body) => {
    const { peekTenantId } = await import("./site-billing-webhook.service.js");
    expect(peekTenantId(body)).toBeNull();
  });
});

describe("verifySiteBillingWebhook", () => {
  beforeEach(() => {
    resolveCredentials.mockReset();
  });

  // 没配密钥 = 收不到通知，但也绝不能当成「验过了」放行
  it("站点没配 webhook 密钥时不放行", async () => {
    resolveCredentials.mockResolvedValueOnce({
      apiKey: "key",
      webhookSecret: "",
      server: "test",
      source: "platform",
    });

    const { verifySiteBillingWebhook } = await import(
      "./site-billing-webhook.service.js"
    );
    const event = await verifySiteBillingWebhook({
      tenant_id: "tenant-1",
      raw_body: "{}",
      headers: {},
    });
    expect(event).toBeNull();
  });

  it("验签失败返回 null 而不是抛", async () => {
    resolveCredentials.mockResolvedValueOnce({
      apiKey: "key",
      webhookSecret: "whsec_real",
      server: "test",
      source: "platform",
    });

    const { verifySiteBillingWebhook } = await import(
      "./site-billing-webhook.service.js"
    );
    const event = await verifySiteBillingWebhook({
      tenant_id: "tenant-1",
      raw_body: '{"hello":"world"}',
      headers: { "creem-signature": "deadbeef" },
    });
    expect(event).toBeNull();
  });
});

describe("handleSiteBillingWebhook", () => {
  beforeEach(() => {
    findFirstSubscription.mockReset();
    upsertSubscription.mockReset();
    updateSubscription.mockReset();
    upsertPayment.mockReset();
    findFirstPlan.mockReset();
  });

  it("按 tenant_id + 唯一键 upsert 订阅与付款", async () => {
    findFirstPlan.mockResolvedValueOnce({ id: "plan-1" });
    upsertSubscription.mockResolvedValueOnce({ id: "sub-local-1" });
    upsertPayment.mockResolvedValueOnce({});

    const { handleSiteBillingWebhook } = await import(
      "./site-billing-webhook.service.js"
    );
    const result = await handleSiteBillingWebhook({
      tenant_id: "tenant-1",
      event: GRANT_EVENT,
    });

    expect(result.handled).toBe(true);
    expect(upsertSubscription.mock.calls[0]![0].where).toEqual({
      tenant_id_provider_provider_subscription_id: {
        tenant_id: "tenant-1",
        provider: "creem",
        provider_subscription_id: "sub_1",
      },
    });
    expect(upsertPayment.mock.calls[0]![0].where).toEqual({
      tenant_id_provider_provider_order_id: {
        tenant_id: "tenant-1",
        provider: "creem",
        provider_order_id: "ord_1",
      },
    });
  });

  /*
   * 写哪个租户由**调用方**给（验签时用的那个），不再从报文里读。报文里的 tenant_id
   * 只是「拿哪把钥匙」的提示，用它来决定写哪张表等于把两件事混成一件。
   */
  it("落库用调用方给的 tenant_id，不用报文里的", async () => {
    findFirstPlan.mockResolvedValueOnce(null);
    upsertSubscription.mockResolvedValueOnce({ id: "sub-local-1" });
    upsertPayment.mockResolvedValueOnce({});

    const { handleSiteBillingWebhook } = await import(
      "./site-billing-webhook.service.js"
    );
    await handleSiteBillingWebhook({
      tenant_id: "verified-tenant",
      event: GRANT_EVENT,
    });

    const args = upsertSubscription.mock.calls[0]![0];
    expect(args.where.tenant_id_provider_provider_subscription_id.tenant_id).toBe(
      "verified-tenant",
    );
    expect(args.create.tenant_id).toBe("verified-tenant");
  });

  it("缺 member_id 时不落库", async () => {
    const { handleSiteBillingWebhook } = await import(
      "./site-billing-webhook.service.js"
    );
    const result = await handleSiteBillingWebhook({
      tenant_id: "tenant-1",
      event: {
        id: "evt_2",
        type: "subscription.paid",
        raw: {},
        data: { object: { id: "sub_2", metadata: { tenant_id: "tenant-1" } } },
      } as never,
    });

    expect(result.handled).toBe(false);
    expect(upsertSubscription).not.toHaveBeenCalled();
  });

  it("取消事件只改状态，不碰别的订阅", async () => {
    findFirstSubscription.mockResolvedValueOnce({
      id: "sub-local-1",
      cancel_at_period_end: false,
      current_period_end: null,
    });
    updateSubscription.mockResolvedValueOnce({});

    const { handleSiteBillingWebhook } = await import(
      "./site-billing-webhook.service.js"
    );
    const result = await handleSiteBillingWebhook({
      tenant_id: "tenant-1",
      event: {
        id: "evt_3",
        type: "subscription.canceled",
        raw: {},
        data: {
          object: {
            id: "sub_1",
            status: "canceled",
            metadata: { member_id: "member-1", plan_slug: "basic" },
          },
        },
      } as never,
    });

    expect(result.handled).toBe(true);
    expect(updateSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "canceled" }),
      }),
    );
    expect(upsertSubscription).not.toHaveBeenCalled();
  });
});

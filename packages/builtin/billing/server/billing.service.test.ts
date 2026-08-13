import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@rewindom/server-kernel/lib/config.js", () => ({
  config: {
    billing: {
      creem: {
        apiKey: "test_key",
        webhookSecret: "whsec_test",
        storeId: "sto_test",
        server: "test",
        productMap: { starter: "prod_starter", pro: "prod_pro" },
      },
    },
    frontend: { url: "https://app.example.com" },
  },
}));

const findManySubscription = vi.fn();
const findFirstSubscription = vi.fn();

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
  prisma: {
    subscription: {
      findMany: (...args: unknown[]) => findManySubscription(...args),
      findFirst: (...args: unknown[]) => findFirstSubscription(...args),
    },
    payment: {},
  },
}));

const updateTenantPlan = vi.fn();

vi.mock("../../platform/server/services/tenant-management.service.js", () => ({
  updateTenantPlan: (...args: unknown[]) => updateTenantPlan(...args),
}));

describe("reconcileTenantPlan", () => {
  beforeEach(() => {
    findManySubscription.mockReset();
    findFirstSubscription.mockReset();
    updateTenantPlan.mockReset();
  });

  /*
   * 这条就是那个 bug 的回归测试：升到 pro 之后，旧的 starter 在通道侧被取消，
   * 取消事件到达时组织**还在 pro**。以前无条件 revokeToFreePlan，用户刚付完钱就失权。
   */
  it("还有生效订阅时不降级，按最高一档回写", async () => {
    findManySubscription.mockResolvedValueOnce([
      { plan_slug: "pro", current_period_end: new Date("2026-09-01T00:00:00Z") },
    ]);

    const { reconcileTenantPlan } = await import("./billing.service.js");
    await reconcileTenantPlan("tenant-1");

    expect(updateTenantPlan).toHaveBeenCalledWith("tenant-1", {
      plan: "pro",
      plan_ends_at: "2026-09-01T00:00:00.000Z",
    });
  });

  it("同时留着两条订阅时取更贵的那一档", async () => {
    findManySubscription.mockResolvedValueOnce([
      { plan_slug: "starter", current_period_end: null },
      { plan_slug: "pro", current_period_end: null },
    ]);

    const { reconcileTenantPlan } = await import("./billing.service.js");
    await reconcileTenantPlan("tenant-1");

    expect(updateTenantPlan).toHaveBeenCalledWith("tenant-1", {
      plan: "pro",
      plan_ends_at: null,
    });
  });

  it("一条生效订阅都不剩才落 free", async () => {
    findManySubscription.mockResolvedValueOnce([]);

    const { reconcileTenantPlan } = await import("./billing.service.js");
    await reconcileTenantPlan("tenant-1");

    expect(updateTenantPlan).toHaveBeenCalledWith("tenant-1", {
      plan: "free",
      plan_ends_at: null,
    });
  });
});

describe("listBillingPlanOffers", () => {
  /*
   * 可售套餐从 PRICING_PLANS 推导：不是 free、而且标了价。硬编码那份表里加一档
   * 套餐要改两处，漏掉的那处不报错，只让新套餐在结账页上凭空消失。
   */
  it("只列出标了价的付费套餐", async () => {
    const { listBillingPlanOffers } = await import("./billing.service.js");
    const slugs = listBillingPlanOffers().map((offer) => offer.plan_slug);

    expect(slugs).toEqual(["starter", "pro", "business"]);
  });

  it("按当前套餐标出升降方向", async () => {
    const { listBillingPlanOffers } = await import("./billing.service.js");
    const bySlug = new Map(
      listBillingPlanOffers("pro").map((offer) => [offer.plan_slug, offer]),
    );

    expect(bySlug.get("starter")?.change_kind).toBe("downgrade");
    expect(bySlug.get("pro")?.change_kind).toBe("current");
    expect(bySlug.get("business")?.change_kind).toBe("upgrade");
  });

  it("没有订阅时每一档都是首次开通", async () => {
    const { listBillingPlanOffers } = await import("./billing.service.js");
    for (const offer of listBillingPlanOffers(null)) {
      expect(offer.change_kind).toBe("none");
    }
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

const groupBy = vi.fn();

vi.mock("@rewindom/module-sdk/server", () => ({
  prisma: { newsEvent: { groupBy } },
  withTenantScope: (tenantId: string, rest: object = {}) => ({
    tenant_id: tenantId,
    ...rest,
  }),
}));

const { getEntityProfile } = await import("./entity-profile.service.js");

const NOW = new Date("2026-08-19T12:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  groupBy.mockResolvedValue([]);
});

const profile = (filter: Record<string, unknown> = {}) =>
  getEntityProfile({
    tenant_id: "t1",
    entity_slug: "cloudflare-abc123",
    event_filter: filter,
    now: NOW,
  });

const group = (
  kind: string | null,
  count: number,
  minutes: number | null = null,
) => ({ kind, _count: count, _sum: { fact_duration_minutes: minutes } });

describe("getEntityProfile", () => {
  /*
   * 「近 90 天 1 件事」是噪音，而实体图里大量实体只关联一个事件
   *（实体抽取刻意保守，长尾很长）。
   */
  it("窗口内不足两件事时整块留白", async () => {
    groupBy.mockResolvedValue([group(null, 1)]);
    expect(await profile()).toEqual([]);
  });

  it("总数 + 各类型次数，按次数降序", async () => {
    groupBy.mockResolvedValue([
      group("release", 2),
      group("outage", 5, 192),
      group(null, 4),
    ]);
    const facts = await profile();
    expect(facts).toEqual([
      // 总数含判不出类型的那些——它们确实发生过
      { code: "profile.window", params: { days: 90, count: 11 } },
      { code: "profile.kindCount", params: { kind: "kind.outage", count: 5 } },
      { code: "profile.kindCount", params: { kind: "kind.release", count: 2 } },
      { code: "profile.outageTotal", params: { minutes: 192 } },
    ]);
  });

  /*
   * 「未分类 806 次」不是一个类型，写出来只是把「我们判不出来」放大成一个品类。
   * 但它必须计入总数——那些事确实发生过。
   */
  it("判不出类型的只计入总数，不单独列一行", async () => {
    groupBy.mockResolvedValue([group(null, 9), group("legal", 1)]);
    const facts = await profile();
    expect(facts[0].params).toEqual({ days: 90, count: 10 });
    expect(facts.filter((f) => f.code === "profile.kindCount")).toHaveLength(1);
  });

  /* 库里的 kind 是 String，历史脏值不该长出一行 `kind.whatever`。 */
  it("枚举外的 kind 当作没有类型", async () => {
    groupBy.mockResolvedValue([group("whatever", 3), group("outage", 2, 30)]);
    const facts = await profile();
    expect(facts.filter((f) => f.code === "profile.kindCount")).toEqual([
      { code: "profile.kindCount", params: { kind: "kind.outage", count: 2 } },
    ]);
    // 但仍然计入总数
    expect(facts[0].params).toEqual({ days: 90, count: 5 });
  });

  it("没有故障时长就不给那一行", async () => {
    groupBy.mockResolvedValue([group("outage", 3, null), group("legal", 1)]);
    const facts = await profile();
    expect(facts.map((f) => f.code)).not.toContain("profile.outageTotal");
  });

  /*
   * 档案里数了 12 件事、下面的列表只列出 8 件，读者会以为页面坏了。
   * 所以过滤条件必须与实体页的事件列表逐字一致。
   */
  it("原样带上实体页的事件过滤条件", async () => {
    groupBy.mockResolvedValue([group("outage", 2, 10)]);
    await profile({ topic: { in: ["ai", "tech"] } });
    expect(groupBy.mock.calls[0][0].where).toMatchObject({
      tenant_id: "t1",
      topic: { in: ["ai", "tech"] },
      entities: { some: { entity: { slug: "cloudflare-abc123" } } },
    });
  });

  /* 窗口与归位共用一个常量，两处不许各写一个数。 */
  it("窗口是 90 天", async () => {
    groupBy.mockResolvedValue([group("outage", 2, 10)]);
    await profile();
    expect(
      groupBy.mock.calls[0][0].where.first_seen_at.gte.getTime(),
    ).toBe(NOW.getTime() - 90 * 86_400_000);
  });
});

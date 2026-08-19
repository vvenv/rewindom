import { describe, expect, it, vi, beforeEach } from "vitest";

const count = vi.fn();
const aggregate = vi.fn();
const findFirst = vi.fn();

vi.mock("@rewindom/module-sdk/server", () => ({
  prisma: {
    newsEvent: { count, aggregate, findFirst },
  },
  withTenantScope: (tenantId: string, rest: object = {}) => ({
    tenant_id: tenantId,
    ...rest,
  }),
}));

const { getEventPlacement, getEventPlacementForDetail } = await import(
  "./placement.service.js"
);

const NOW = new Date("2026-08-19T12:00:00Z");
const FIRST_SEEN = new Date("2026-08-19T09:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  count.mockResolvedValue(0);
  aggregate.mockResolvedValue({ _count: 0, _sum: { fact_duration_minutes: null } });
  findFirst.mockResolvedValue(null);
});

const placement = (over: Partial<Parameters<typeof getEventPlacement>[0]> = {}) =>
  getEventPlacement({
    tenant_id: "t1",
    event_id: "e1",
    kind: null,
    entity_id: "ent1",
    entity_name: "Cloudflare",
    first_seen_at: FIRST_SEEN,
    now: NOW,
    ...over,
  });

describe("getEventPlacement", () => {
  /*
   * 第一次出现的实体没有「归位」可讲。留白比写「这是第 1 次」强——
   * 后者是噪音，而语料里绝大多数事件都是这种。
   */
  it("这是它第一次出现时整块留白", async () => {
    expect(await placement()).toEqual([]);
  });

  it("同实体还有别的事件时给出现次数", async () => {
    count.mockResolvedValue(3);
    const facts = await placement();
    expect(facts).toEqual([
      {
        code: "placement.recurrence",
        // 眼前这条也算一次：读者看到的「4 次」里包含他正在读的这条
        params: { entity: "Cloudflare", days: 90, count: 4 },
      },
    ]);
  });

  it("有 kind 时再给同类型的次数，kind 作为嵌套 code 传出去", async () => {
    count.mockResolvedValue(5);
    aggregate.mockResolvedValue({
      _count: 3,
      _sum: { fact_duration_minutes: 192 },
    });
    const facts = await placement({ kind: "outage" });
    expect(facts.map((f) => f.code)).toEqual([
      "placement.recurrence",
      "placement.kindRecurrence",
      "placement.outageTotal",
    ]);
    expect(facts[1].params).toEqual({
      entity: "Cloudflare",
      days: 90,
      count: 4,
      // 落成文案是渲染侧的事——service 只给 code
      kind: "kind.outage",
    });
    expect(facts[2].params).toEqual({ minutes: 192 });
  });

  /* 累计时长只对故障给：发版或收购的「累计分钟」没有意义。 */
  it("非故障不给累计时长", async () => {
    count.mockResolvedValue(2);
    aggregate.mockResolvedValue({
      _count: 2,
      _sum: { fact_duration_minutes: 60 },
    });
    const facts = await placement({ kind: "release" });
    expect(facts.map((f) => f.code)).not.toContain("placement.outageTotal");
  });

  it("上一次带天数与 slug，href 留给渲染侧拼", async () => {
    findFirst.mockResolvedValue({
      slug: "waf-errors-abc123",
      title: "Elevated error rates in WAF",
      first_seen_at: new Date("2026-08-08T09:00:00Z"),
    });
    const facts = await placement();
    expect(facts).toEqual([
      {
        code: "placement.previous",
        params: { days: 11, title: "Elevated error rates in WAF" },
        event_slug: "waf-errors-abc123",
      },
    ]);
  });

  /* 「0 天前」读起来像没算出来。 */
  it("不足一天时换一条文案，不写 0 天前", async () => {
    findFirst.mockResolvedValue({
      slug: "s",
      title: "Earlier incident",
      first_seen_at: new Date("2026-08-19T02:00:00Z"),
    });
    const facts = await placement();
    expect(facts[0].code).toBe("placement.previousToday");
  });

  /* 一件比它新的事不叫「上一次」。 */
  it("上一次只查更早的那些", async () => {
    await placement();
    expect(findFirst.mock.calls[0][0].where.first_seen_at).toMatchObject({
      lt: FIRST_SEEN,
    });
  });

  it("查询恒排除本事件自己，并限定在窗口内", async () => {
    await placement();
    const where = count.mock.calls[0][0].where;
    expect(where.id).toEqual({ not: "e1" });
    expect(where.entities).toEqual({ some: { entity_id: "ent1" } });
    expect(where.first_seen_at.gte.getTime()).toBe(
      NOW.getTime() - 90 * 86_400_000,
    );
  });
});

describe("getEventPlacementForDetail", () => {
  /*
   * 实体抽取刻意保守（覆盖率约 36%）。挂到一个抽错的实体上会把这条材料放进
   * 不相干的记录里，而读者没有办法核对——所以没实体就留白，且**一次查询都不发**。
   */
  it("没有实体时留白，且不查库", async () => {
    const facts = await getEventPlacementForDetail({
      tenant_id: "t1",
      event: { id: "e1", kind: "outage", first_seen_at: FIRST_SEEN },
      entities: [],
    });
    expect(facts).toEqual([]);
    expect(count).not.toHaveBeenCalled();
  });

  it("取排在最前的实体（listEventEntities 已按 mention_count 降序）", async () => {
    count.mockResolvedValue(1);
    await getEventPlacementForDetail({
      tenant_id: "t1",
      event: { id: "e1", kind: null, first_seen_at: FIRST_SEEN },
      entities: [
        { entity: { id: "top", name: "Cloudflare" } },
        { entity: { id: "other", name: "AWS" } },
      ],
    });
    expect(count.mock.calls[0][0].where.entities).toEqual({
      some: { entity_id: "top" },
    });
  });

  /* 库里的 kind 是 String，可能是历史脏值——枚举外的一律当没有类型。 */
  it("枚举外的 kind 当作没有类型", async () => {
    count.mockResolvedValue(1);
    await getEventPlacementForDetail({
      tenant_id: "t1",
      event: { id: "e1", kind: "whatever", first_seen_at: FIRST_SEEN },
      entities: [{ entity: { id: "ent1", name: "Cloudflare" } }],
    });
    expect(aggregate).not.toHaveBeenCalled();
  });
});

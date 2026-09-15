import { describe, expect, it, vi, beforeEach } from "vitest";

const linkFindMany = vi.fn();
const linkGroupBy = vi.fn();
const entityFindMany = vi.fn();

vi.mock("@rewindom/module-sdk/server", () => ({
  prisma: {
    eventEntityLink: { findMany: linkFindMany, groupBy: linkGroupBy },
    eventEntity: { findMany: entityFindMany },
  },
  withTenantScope: (tenantId: string, rest: object = {}) => ({
    tenant_id: tenantId,
    ...rest,
  }),
}));

const { getEntityCoOccurrence } = await import(
  "./entity-co-occurrence.service.js"
);

beforeEach(() => {
  vi.clearAllMocks();
  linkFindMany.mockResolvedValue([]);
  linkGroupBy.mockResolvedValue([]);
  entityFindMany.mockResolvedValue([]);
});

const coOccurrence = (filter: Record<string, unknown> = {}) =>
  getEntityCoOccurrence({
    tenant_id: "t1",
    entity_id: "openai-id",
    event_filter: filter,
  });

const link = (eventId: string) => ({ event_id: eventId });
const group = (entityId: string, count: number) => ({
  entity_id: entityId,
  _count: { event_id: count },
});
const entity = (id: string, slug: string, name: string, kind = "company") => ({
  id,
  slug,
  name,
  kind,
});

describe("getEntityCoOccurrence", () => {
  it("当前实体没有关联事件时留白", async () => {
    linkFindMany.mockResolvedValue([]);
    expect(await coOccurrence()).toEqual([]);
    // 没有事件 id 就不该再查 groupBy
    expect(linkGroupBy).not.toHaveBeenCalled();
  });

  it("按共现事件数降序，带展示信息", async () => {
    linkFindMany.mockResolvedValue([link("e1"), link("e2"), link("e3")]);
    linkGroupBy.mockResolvedValue([
      group("meta-id", 3),
      group("tiktok-id", 2),
    ]);
    entityFindMany.mockResolvedValue([
      entity("meta-id", "meta", "Meta"),
      entity("tiktok-id", "tiktok", "TikTok"),
    ]);

    const result = await coOccurrence();
    expect(result).toEqual([
      { slug: "meta", name: "Meta", kind: "company", co_occurrence_count: 3 },
      { slug: "tiktok", name: "TikTok", kind: "company", co_occurrence_count: 2 },
    ]);
  });

  /*
   * 「和它一起出现过 1 次」是噪音——实体抽取保守、长尾很长，一次共现大概率是巧合。
   * 与 entity-profile MIN_EVENTS=2 同口径。
   */
  it("单次共现的实体跳过", async () => {
    linkFindMany.mockResolvedValue([link("e1"), link("e2")]);
    linkGroupBy.mockResolvedValue([
      group("meta-id", 3),
      group("noise-id", 1),
    ]);
    entityFindMany.mockResolvedValue([entity("meta-id", "meta", "Meta")]);

    const result = await coOccurrence();
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("meta");
  });

  it("全部单次共现时整段留白", async () => {
    linkFindMany.mockResolvedValue([link("e1")]);
    linkGroupBy.mockResolvedValue([group("noise-id", 1)]);
    expect(await coOccurrence()).toEqual([]);
  });

  /* 共现是结构性关系，不是时序性的——事件集合已经按 event_filter 过滤过了。 */
  it("原样带上实体页的事件过滤条件", async () => {
    linkFindMany.mockResolvedValue([link("e1")]);
    linkGroupBy.mockResolvedValue([]);
    await coOccurrence({ topic: { in: ["ai", "tech"] } });
    expect(linkFindMany.mock.calls[0][0].where).toMatchObject({
      tenant_id: "t1",
      entity_id: "openai-id",
      event: { topic: { in: ["ai", "tech"] } },
    });
  });

  /* 详情页放得下的条数——再多就该是一个列表页。与 RELATED_LIMIT 对称。 */
  it("最多取 5 条", async () => {
    linkFindMany.mockResolvedValue([link("e1")]);
    expect(linkGroupBy).not.toHaveBeenCalled();
    await coOccurrence();
    expect(linkGroupBy.mock.calls[0][0].take).toBe(5);
  });

  /* findMany 不保证顺序——必须按 groupBy 的顺序重排。 */
  it("保持 groupBy 的顺序，不按 findMany 返回顺序", async () => {
    linkFindMany.mockResolvedValue([link("e1"), link("e2")]);
    linkGroupBy.mockResolvedValue([
      group("first-id", 5),
      group("second-id", 3),
    ]);
    // findMany 故意倒序返回
    entityFindMany.mockResolvedValue([
      entity("second-id", "second", "Second"),
      entity("first-id", "first", "First"),
    ]);

    const result = await coOccurrence();
    expect(result.map((r) => r.slug)).toEqual(["first", "second"]);
  });
});

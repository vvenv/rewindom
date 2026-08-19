import { describe, expect, it, vi, beforeEach } from "vitest";

const entityFindUnique = vi.fn();
const entityCreate = vi.fn();
const linkDeleteMany = vi.fn();
const linkUpsert = vi.fn();
const transaction = vi.fn(async (ops: unknown[]) => ops);

vi.mock("@rewindom/module-sdk/server", () => ({
  prisma: {
    eventEntity: { findUnique: entityFindUnique, create: entityCreate },
    eventEntityLink: {
      deleteMany: linkDeleteMany,
      upsert: linkUpsert,
      findMany: vi.fn(),
    },
    $transaction: transaction,
  },
  withTenantScope: (tenantId: string, rest: object = {}) => ({
    tenant_id: tenantId,
    ...rest,
  }),
}));

const { syncEventEntities } = await import("./entity.service.js");

let created = 0;
beforeEach(() => {
  vi.clearAllMocks();
  created = 0;
  entityFindUnique.mockResolvedValue(null);
  entityCreate.mockImplementation(async () => ({ id: `e${created++}` }));
  linkDeleteMany.mockReturnValue({ op: "delete" });
  linkUpsert.mockImplementation((args: unknown) => args);
  transaction.mockImplementation(async (ops: unknown[]) => ops);
});

const sync = (entities: { name: string; kind: string; mention_count: number }[]) =>
  syncEventEntities({
    tenant_id: "t1",
    event_id: "ev1",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entities: entities as any,
  });

describe("syncEventEntities", () => {
  it("同名同类合并，提及次数相加", async () => {
    await sync([
      { name: "GitHub", kind: "company", mention_count: 2 },
      { name: "github", kind: "company", mention_count: 3 },
    ]);
    expect(entityCreate).toHaveBeenCalledTimes(1);
    expect(linkUpsert.mock.calls[0][0].create.mention_count).toBe(5);
  });

  it("所有格与大小写归一到同一个实体", async () => {
    await sync([
      { name: "Trump's", kind: "person", mention_count: 1 },
      { name: "Trump", kind: "person", mention_count: 1 },
    ]);
    expect(entityCreate).toHaveBeenCalledTimes(1);
  });

  /*
   * 实体是**当前信号集合**的函数。不撤掉本轮没抽到的关联，
   * 事件会永远背着早期措辞里的误抽。与时间线同理。
   */
  it("撤掉本轮没抽到的关联", async () => {
    await sync([{ name: "OpenAI", kind: "company", mention_count: 1 }]);
    const where = linkDeleteMany.mock.calls[0][0].where;
    expect(where.event_id).toBe("ev1");
    expect(where.entity_id.notIn).toEqual(["e0"]);
  });

  it("抽不到实体时把关联全部撤掉", async () => {
    await sync([]);
    expect(linkDeleteMany.mock.calls[0][0].where.entity_id.notIn).toEqual([]);
    expect(linkUpsert).not.toHaveBeenCalled();
  });

  it("changelog 署名不当实体，关联按抽不到处理", async () => {
    await sync([
      { name: "@aduh95", kind: "person", mention_count: 2 },
      { name: "58717685a1", kind: "org", mention_count: 1 },
    ]);
    expect(entityCreate).not.toHaveBeenCalled();
    expect(linkUpsert).not.toHaveBeenCalled();
    expect(linkDeleteMany.mock.calls[0][0].where.entity_id.notIn).toEqual([]);
  });

  it("封顶 12 个，长标题不会炸出一串", async () => {
    await sync(
      Array.from({ length: 30 }, (_, i) => ({
        name: `Entity${i}`,
        kind: "org",
        mention_count: 1,
      })),
    );
    expect(linkUpsert).toHaveBeenCalledTimes(12);
  });

  it("按提及次数降序保留——截断时留下的是被提得最多的", async () => {
    await sync([
      { name: "Rare", kind: "org", mention_count: 1 },
      { name: "Common", kind: "org", mention_count: 9 },
    ]);
    expect(entityCreate.mock.calls[0][0].data.name).toBe("Common");
  });

  it("并发下唯一键冲突时改用已存在的那条，不抛错", async () => {
    entityCreate.mockRejectedValueOnce(new Error("unique violation"));
    entityFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "winner" });

    await sync([{ name: "OpenAI", kind: "company", mention_count: 1 }]);
    expect(linkUpsert.mock.calls[0][0].create.entity_id).toBe("winner");
  });
});

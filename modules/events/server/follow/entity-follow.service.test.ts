import { describe, expect, it, vi, beforeEach } from "vitest";

const entityFindFirst = vi.fn();
const followUpsert = vi.fn();
const followFindFirst = vi.fn();
const followFindMany = vi.fn();
const followDeleteMany = vi.fn();
const followUpdateMany = vi.fn();
const linkCount = vi.fn();
const linkFindMany = vi.fn();

class NotFoundError extends Error {}

vi.mock("@rewindom/module-sdk/server", () => ({
  NotFoundError,
  prisma: {
    eventEntity: { findFirst: entityFindFirst },
    eventEntityFollow: {
      upsert: followUpsert,
      findFirst: followFindFirst,
      findMany: followFindMany,
      deleteMany: followDeleteMany,
      updateMany: followUpdateMany,
    },
    eventEntityLink: { count: linkCount, findMany: linkFindMany },
  },
  withTenantScope: (tenantId: string, rest: object = {}) => ({
    tenant_id: tenantId,
    ...rest,
  }),
}));

const {
  countEntityFollowUpdates,
  followEntity,
  getEntityFollowState,
  markEntitySeen,
  unfollowEntity,
} = await import("./entity-follow.service.js");

const SCOPE = { tenant_id: "t1", user_id: "u1" };
const PARAMS = { ...SCOPE, entity_id: "ent1" };

beforeEach(() => {
  vi.clearAllMocks();
  entityFindFirst.mockResolvedValue({ id: "ent1" });
  followFindFirst.mockResolvedValue(null);
  followFindMany.mockResolvedValue([]);
  linkCount.mockResolvedValue(0);
  linkFindMany.mockResolvedValue([]);
  followUpsert.mockResolvedValue({});
});

describe("followEntity", () => {
  /*
   * 与关注事件同一条理由：不然用户一关注就立刻看到「有更新」，
   * 那条提示会立刻失去意义。
   */
  it("刚关注时把 last_seen_at 设成当下", async () => {
    await followEntity(PARAMS);
    const create = followUpsert.mock.calls[0][0].create;
    expect(create.last_seen_at).toBeInstanceOf(Date);
  });

  it("重复关注是幂等的，不把 last_seen_at 往前推掉未读的新事件", async () => {
    await followEntity(PARAMS);
    expect(followUpsert.mock.calls[0][0].update).toEqual({});
  });

  it("实体不存在时 404，不建悬空关注", async () => {
    entityFindFirst.mockResolvedValue(null);
    await expect(followEntity(PARAMS)).rejects.toBeInstanceOf(NotFoundError);
    expect(followUpsert).not.toHaveBeenCalled();
  });

  it("slug 或 id 都能定位", async () => {
    await followEntity({ ...SCOPE, entity_id: "openai-abc123" });
    expect(entityFindFirst.mock.calls[0][0].where.OR).toEqual([
      { id: "openai-abc123" },
      { slug: "openai-abc123" },
    ]);
  });
});

describe("getEntityFollowState", () => {
  it("没关注时不去数新事件", async () => {
    expect(await getEntityFollowState(PARAMS)).toEqual({
      is_following: false,
      new_event_count: 0,
      last_seen_at: null,
    });
    expect(linkCount).not.toHaveBeenCalled();
  });

  /*
   * 「新」按 EventEntityLink.created_at 判，不按事件的 last_activity_at——
   * 后者会让一个早就读过的老事件因为来了条新信号又冒出来算「新」。
   */
  it("按关联建立时间数新事件，不按事件最近活动时间", async () => {
    const seenAt = new Date("2026-08-18T10:00:00Z");
    followFindFirst.mockResolvedValue({ last_seen_at: seenAt });
    linkCount.mockResolvedValue(3);

    const state = await getEntityFollowState(PARAMS);
    expect(state).toEqual({
      is_following: true,
      new_event_count: 3,
      last_seen_at: seenAt.toISOString(),
    });
    expect(linkCount.mock.calls[0][0].where.created_at).toEqual({ gt: seenAt });
  });
});

describe("countEntityFollowUpdates", () => {
  it("没关注任何实体时为 0，且不发多余查询", async () => {
    expect(await countEntityFollowUpdates(SCOPE)).toBe(0);
    expect(linkFindMany).not.toHaveBeenCalled();
  });

  /*
   * 一个事件同时挂着两个被关注的实体时只算一次——
   * 用户看到的是「有几件新事」，不是「有几条关联」。
   */
  it("同一事件挂多个被关注实体时只算一次", async () => {
    followFindMany.mockResolvedValue([
      { entity_id: "a", last_seen_at: new Date(0) },
      { entity_id: "b", last_seen_at: new Date(0) },
    ]);
    linkFindMany
      .mockResolvedValueOnce([{ event_id: "e1" }, { event_id: "e2" }])
      .mockResolvedValueOnce([{ event_id: "e2" }, { event_id: "e3" }]);

    expect(await countEntityFollowUpdates(SCOPE)).toBe(3);
  });
});

describe("unfollowEntity / markEntitySeen", () => {
  it("取关按站点 + 用户 + 实体删", async () => {
    await unfollowEntity(PARAMS);
    expect(followDeleteMany.mock.calls[0][0].where).toMatchObject({
      tenant_id: "t1",
      user_id: "u1",
      entity_id: "ent1",
    });
  });

  it("标记已读把 last_seen_at 推到当下", async () => {
    await markEntitySeen(PARAMS);
    expect(followUpdateMany.mock.calls[0][0].data.last_seen_at).toBeInstanceOf(Date);
  });
});

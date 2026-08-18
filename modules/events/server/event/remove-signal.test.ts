import { describe, expect, it, vi, beforeEach } from "vitest";

const eventFindFirst = vi.fn();
const eventFindUnique = vi.fn();
const signalFindFirst = vi.fn();
const signalUpdate = vi.fn();
const timelineDeleteMany = vi.fn();
const transaction = vi.fn(async (ops: unknown[]) => ops);
const refreshEvents = vi.fn(async () => 1);
// getEventDetail 在同一个模块里被内部调用，spy 拦不住 ESM 的模块内调用；
// 于是把它依赖的读路径全部打桩，让它跑通并返回一份最小详情
const signalFindMany = vi.fn(async () => []);
const timelineFindMany = vi.fn(async () => []);
const toEventDetail = vi.fn(() => ({ id: "ev1" }));

vi.mock("@rewindom/module-sdk/server", () => ({
  prisma: {
    newsEvent: { findFirst: eventFindFirst, findUnique: eventFindUnique },
    eventSignal: {
      findFirst: signalFindFirst,
      update: signalUpdate,
      findMany: signalFindMany,
    },
    eventTimelineEntry: {
      deleteMany: timelineDeleteMany,
      findMany: timelineFindMany,
    },
    eventFollow: { findMany: vi.fn(async () => []) },
    $transaction: transaction,
  },
  withTenantScope: (tenantId: string, rest: object = {}) => ({
    tenant_id: tenantId,
    ...rest,
  }),
  NotFoundError: class NotFoundError extends Error {
    constructor(public code: string) {
      super(code);
    }
  },
  ValidationError: class ValidationError extends Error {},
  resolveSortField: () => "last_activity_at",
  resolveSortOrder: () => ({}),
}));

vi.mock("./event-refresh.service.js", () => ({ refreshEvents }));
vi.mock("./event.mapper.js", () => ({
  toEventDetail,
  toEventListItem: vi.fn(),
}));
vi.mock("./entity.service.js", () => ({ listEventEntities: async () => [] }));
vi.mock("./related.service.js", () => ({ listRelatedEvents: async () => [] }));
vi.mock("./event-revision.service.js", () => ({
  listEventRevisions: async () => [],
  publicRevisionSince: () => new Date(0),
}));

const { removeEventSignal } = await import("./event.service.js");

const scope = { tenant_id: "t1", user_id: "u1" };

beforeEach(() => {
  vi.clearAllMocks();
  toEventDetail.mockReturnValue({ id: "ev1" });
  signalFindMany.mockResolvedValue([]);
  timelineFindMany.mockResolvedValue([]);
  eventFindFirst.mockResolvedValue({ id: "ev1", related_event_ids: [] });
  signalFindFirst.mockResolvedValue({ id: "sig1", title: "OpenAI 发了公告" });
  eventFindUnique.mockResolvedValue({ id: "ev1" });
  signalUpdate.mockImplementation((args: unknown) => args);
  timelineDeleteMany.mockImplementation((args: unknown) => args);
  transaction.mockImplementation(async (ops: unknown[]) => ops);
});

describe("removeEventSignal", () => {
  it("软删信号并顺手删掉它在时间线上那一格", async () => {
    await removeEventSignal({ ...scope, event_id: "ev1", signal_id: "sig1" });

    // 软删：写 removed_at，不是 delete —— 硬删的话源下一轮又把它抓回来了
    expect(signalUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sig1" },
        data: { removed_at: expect.any(Date) },
      }),
    );
    /*
     * 时间线那一格必须在这里直接删。指望 refreshEvents 顺手带走是错的：
     * planAnalysis 会给已有 LLM 产出、又没进热度窗口的事件判 skip，
     * 那一轮根本不生成 timeline，被移除的信号会继续挂在时间线上。
     */
    expect(timelineDeleteMany).toHaveBeenCalledWith({
      where: { event_id: "ev1", signal_id: "sig1" },
    });
    expect(refreshEvents).toHaveBeenCalledWith(["ev1"]);
  });

  it("只查还活着的信号——已经移除过的再点一次是 404，不是重复软删", async () => {
    signalFindFirst.mockResolvedValue(null);

    await expect(
      removeEventSignal({ ...scope, event_id: "ev1", signal_id: "sig1" }),
    ).rejects.toThrow("events.signal_not_found");

    expect(signalFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ removed_at: null }),
      }),
    );
    expect(signalUpdate).not.toHaveBeenCalled();
  });

  it("移掉最后一条 → 事件被 refresh 删掉，回 event_deleted 让前端跳走", async () => {
    eventFindUnique.mockResolvedValue(null);

    const result = await removeEventSignal({
      ...scope,
      event_id: "ev1",
      signal_id: "sig1",
    });

    expect(result.event_deleted).toBe(true);
    expect(result.event).toBeNull();
  });

  it("事件不存在时不碰任何信号", async () => {
    eventFindFirst.mockResolvedValue(null);

    await expect(
      removeEventSignal({ ...scope, event_id: "nope", signal_id: "sig1" }),
    ).rejects.toThrow("events.not_found");

    expect(signalFindFirst).not.toHaveBeenCalled();
  });
});

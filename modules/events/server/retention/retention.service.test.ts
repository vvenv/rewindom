import { describe, expect, it, vi, beforeEach } from "vitest";

const findManySignal = vi.fn();
const deleteManySignal = vi.fn();
const findManyEvent = vi.fn();
const deleteManyEvent = vi.fn();
const refreshEvents = vi.fn();

vi.mock("@rewindom/module-sdk/server", () => ({
  config: { events: { signalRetentionDays: 90, eventRetentionDays: 180 } },
  prisma: {
    eventSignal: { findMany: findManySignal, deleteMany: deleteManySignal },
    newsEvent: { findMany: findManyEvent, deleteMany: deleteManyEvent },
  },
  withTenantScope: (tenantId: string, rest: object = {}) => ({
    tenant_id: tenantId,
    ...rest,
  }),
}));
vi.mock("../event/event-refresh.service.js", () => ({ refreshEvents }));

const { runRetention } = await import("./retention.service.js");

const NOW = new Date("2026-08-18T12:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  findManySignal.mockResolvedValue([]);
  findManyEvent.mockResolvedValue([]);
  deleteManySignal.mockResolvedValue({ count: 0 });
  deleteManyEvent.mockResolvedValue({ count: 0 });
});

describe("runRetention", () => {
  it("没有站点时什么都不做", async () => {
    const summary = await runRetention({ now: NOW, tenant_ids: [] });
    expect(summary).toEqual({ tenants: 0, signals_deleted: 0, events_deleted: 0 });
    expect(deleteManySignal).not.toHaveBeenCalled();
  });

  it("按保留期算截止时间：信号 90 天、事件 180 天", async () => {
    await runRetention({ now: NOW, tenant_ids: ["t1"] });
    const signalWhere = findManySignal.mock.calls[0][0].where;
    const eventWhere = findManyEvent.mock.calls[0][0].where;
    expect(signalWhere.published_at.lt).toEqual(
      new Date(NOW.getTime() - 90 * 86400_000),
    );
    expect(eventWhere.last_activity_at.lt).toEqual(
      new Date(NOW.getTime() - 180 * 86400_000),
    );
  });

  /*
   * 产品约束，不是性能取舍：用户按关注键收藏的东西不该被后台任务收走。
   * 信号侧也要豁免——只删事件不删信号会让详情页变成一张空壳。
   */
  it("被关注过的事件豁免，其信号也不删", async () => {
    await runRetention({ now: NOW, tenant_ids: ["t1"] });
    expect(findManySignal.mock.calls[0][0].where.OR).toEqual([
      { event_id: null },
      { event: { follows: { none: {} } } },
    ]);
    expect(findManyEvent.mock.calls[0][0].where.follows).toEqual({ none: {} });
  });

  it("只删已经没有信号的事件——还有信号说明它没到期或被豁免了", async () => {
    await runRetention({ now: NOW, tenant_ids: ["t1"] });
    expect(findManyEvent.mock.calls[0][0].where.signals).toEqual({ none: {} });
  });

  it("删完信号后重算受影响的事件，空壳才会被 refreshEvents 清掉", async () => {
    findManySignal
      .mockResolvedValueOnce([
        { id: "s1", event_id: "e1" },
        { id: "s2", event_id: "e1" },
        { id: "s3", event_id: null },
      ])
      .mockResolvedValue([]);

    const summary = await runRetention({ now: NOW, tenant_ids: ["t1"] });

    expect(summary.signals_deleted).toBe(3);
    expect(refreshEvents).toHaveBeenCalledTimes(1);
    expect([...refreshEvents.mock.calls[0][0]]).toEqual(["e1"]);
  });

  it("分批删，不一条语句删几十万行", async () => {
    const batch = Array.from({ length: 1000 }, (_, i) => ({
      id: `s${i}`,
      event_id: null,
    }));
    findManySignal.mockResolvedValueOnce(batch).mockResolvedValue([]);

    await runRetention({ now: NOW, tenant_ids: ["t1"] });

    expect(findManySignal.mock.calls[0][0].take).toBe(1000);
    expect(deleteManySignal).toHaveBeenCalledTimes(1);
  });

  it("多站点各算各的，汇总相加", async () => {
    findManySignal
      .mockResolvedValueOnce([{ id: "a", event_id: null }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "b", event_id: null }])
      .mockResolvedValue([]);

    const summary = await runRetention({ now: NOW, tenant_ids: ["t1", "t2"] });
    expect(summary.tenants).toBe(2);
    expect(summary.signals_deleted).toBe(2);
  });
});

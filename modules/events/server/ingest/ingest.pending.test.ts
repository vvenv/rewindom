import { describe, expect, it, vi, beforeEach } from "vitest";

const findManyTenant = vi.fn();
const findManyTenantSetting = vi.fn();
const findManyFeed = vi.fn();
const findManySignal = vi.fn();
const findManyEvent = vi.fn();

const clusterSignals = vi.fn();
const refreshEvents = vi.fn();
const syncRelatedEvents = vi.fn();
const pruneBoilerplateExcerpts = vi.fn();
const enrichStoredEmptyExcerpts = vi.fn();
const ensureDefaultFeeds = vi.fn();
const getEnabledTopics = vi.fn();
const listClassifyCandidates = vi.fn();

vi.mock("@rewindom/module-sdk/server", () => ({
  config: {
    events: { ingestIntervalMinutes: 15, pendingClusterLimit: 500 },
  },
  prisma: {
    tenant: { findMany: findManyTenant },
    tenantSetting: { findMany: findManyTenantSetting },
    eventFeed: { findMany: findManyFeed },
    eventSignal: { findMany: findManySignal },
    newsEvent: { findMany: findManyEvent },
  },
  withTenantScope: (tenantId: string, rest: object = {}) => ({
    tenant_id: tenantId,
    ...rest,
  }),
}));
vi.mock("@rewindom/builtin/platform/shared/tenant-modules.js", () => ({
  TENANT_MODULES_STORAGE_KEY: "tenant.modules",
}));
vi.mock("../lib/entitlement.js", () => ({
  isEventsModuleEnabled: () => true,
}));
vi.mock("../event/cluster.service.js", () => ({ clusterSignals }));
vi.mock("../event/event-refresh.service.js", () => ({
  refreshEvents,
  listClassifyCandidates,
}));
vi.mock("../event/related.service.js", () => ({ syncRelatedEvents }));
vi.mock("../event/topic-settings.service.js", () => ({ getEnabledTopics }));
vi.mock("./excerpt-boilerplate.js", () => ({ pruneBoilerplateExcerpts }));
vi.mock("./excerpt-enrichment.js", () => ({
  clearAnalysisForExcerptUpgrade: vi.fn(),
  enrichStoredEmptyExcerpts,
}));
vi.mock("./feed-seed.js", () => ({ ensureDefaultFeeds }));

const { runIngest } = await import("./ingest.service.js");

const NOW = new Date("2026-08-25T12:00:00Z");

function pendingSignal(id: string, publishedAt: string) {
  return {
    id,
    tenant_id: "t1",
    title: `signal ${id}`,
    excerpt: "",
    topic: "tech",
    source_kind: "news",
    canonical_url: `https://example.com/${id}`,
    published_at: new Date(publishedAt),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  findManyTenant.mockResolvedValue([{ id: "t1" }]);
  findManyTenantSetting.mockResolvedValue([]);
  // 源为空 = 这一轮没有抓取，直接走到轮内各阶段。整站跳过的判据是
  // 「有源但都没到点」，一个源都没有的站点照常跑（降温扫描还得继续）。
  findManyFeed.mockResolvedValue([]);
  findManySignal.mockResolvedValue([]);
  findManyEvent.mockResolvedValue([]);
  getEnabledTopics.mockResolvedValue(["tech"]);
  ensureDefaultFeeds.mockResolvedValue(undefined);
  pruneBoilerplateExcerpts.mockResolvedValue([]);
  enrichStoredEmptyExcerpts.mockResolvedValue([]);
  clusterSignals.mockResolvedValue(new Set<string>());
  refreshEvents.mockResolvedValue(0);
  listClassifyCandidates.mockResolvedValue([]);
  syncRelatedEvents.mockResolvedValue(undefined);
});

describe("聚类待办由库说了算", () => {
  it("查的是还没归属事件的信号，不是本轮 persist 出来的 id", async () => {
    await runIngest({ now: NOW });

    const args = findManySignal.mock.calls[0][0];
    expect(args.where).toEqual({
      tenant_id: "t1",
      event_id: null,
      removed_at: null,
    });
  });

  /*
   * 积压时必须最早的先补：先立事件的应该是原始公告，不是后续报道
   * （clusterSignals 头注释里的同一条理由）。clusterSignals 自己也排序，
   * 但那发生在 take 之后——顺序反了，被 take 截掉的就是错的那一批。
   */
  it("按 published_at 升序取，限额来自配置", async () => {
    await runIngest({ now: NOW });

    const args = findManySignal.mock.calls[0][0];
    expect(args.orderBy).toEqual({ published_at: "asc" });
    expect(args.take).toBe(500);
  });

  it("查到的信号原样送进聚类，并单列 pending_clustered", async () => {
    const pending = [
      pendingSignal("s1", "2026-08-18T00:00:00Z"),
      pendingSignal("s2", "2026-08-24T00:00:00Z"),
    ];
    findManySignal.mockResolvedValue(pending);

    const summary = await runIngest({ now: NOW });

    expect(clusterSignals).toHaveBeenCalledWith(pending);
    expect(summary.pending_clustered).toBe(2);
    // `created` 是「本轮真正入库的新信号」，补跑历史孤儿不算新增
    expect(summary.created).toBe(0);
  });
});

describe("轮内阶段互不牵连", () => {
  /*
   * 这一条就是 2478 条孤儿信号的成因：摘录补齐在发网络请求，它一抛，
   * 后面的聚类整段不执行；而信号已经落库、persist 又是幂等的，
   * 下一轮不会把它们重新 create——于是永久孤儿。
   */
  it("摘录补齐抛异常时，聚类照常跑", async () => {
    enrichStoredEmptyExcerpts.mockRejectedValue(new Error("目标页超时"));
    findManySignal.mockResolvedValue([
      pendingSignal("s1", "2026-08-18T00:00:00Z"),
    ]);

    const summary = await runIngest({ now: NOW });

    expect(clusterSignals).toHaveBeenCalledTimes(1);
    expect(summary.pending_clustered).toBe(1);
  });

  it("阶段失败要出现在 failures 里，不能 catch 之后当没事", async () => {
    enrichStoredEmptyExcerpts.mockRejectedValue(new Error("目标页超时"));

    const summary = await runIngest({ now: NOW });

    expect(summary.failures).toEqual([
      { feed: "", stage: "摘录补齐", error: "目标页超时" },
    ]);
  });

  it("聚类自己抛也不该让刷新与相关事件跟着不跑", async () => {
    clusterSignals.mockRejectedValue(new Error("embedding 供应商 5xx"));

    const summary = await runIngest({ now: NOW });

    expect(refreshEvents).toHaveBeenCalledTimes(1);
    expect(syncRelatedEvents).toHaveBeenCalledTimes(1);
    expect(summary.failures[0].stage).toBe("聚类");
  });
});

/*
 * 窄分类挂在 refreshEvent 里，所以候选必须进刷新队列——否则只有本轮恰好被动过的
 * 事件才轮得到，而存量语料按定义早就不动了（`cooling` / `resolved` 的事件不再进
 * `touched`）。实测：不并进来时一轮只补 4 个，六千个事件要排半个月。
 */
describe("分类待办进刷新队列", () => {
  it("候选并进 touched，跟着这一轮刷新", async () => {
    listClassifyCandidates.mockResolvedValue(["e1", "e2"]);

    await runIngest({ now: NOW });

    const queue = [...refreshEvents.mock.calls[0][0]];
    expect(queue).toEqual(expect.arrayContaining(["e1", "e2"]));
  });

  it("查候选失败不影响这一轮的其余部分", async () => {
    listClassifyCandidates.mockRejectedValue(new Error("库抖了一下"));

    const summary = await runIngest({ now: NOW });

    expect(refreshEvents).toHaveBeenCalledTimes(1);
    expect(summary.failures[0].stage).toBe("分类待办");
  });
});

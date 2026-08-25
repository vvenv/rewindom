import { beforeEach, describe, expect, it, vi } from "vitest";

const eventFindFirst = vi.fn();
const eventFindMany = vi.fn();
const siteFindFirst = vi.fn();

vi.mock("@rewindom/module-sdk/server", () => ({
  prisma: {
    newsEvent: { findFirst: eventFindFirst, findMany: eventFindMany },
    marketingSite: { findFirst: siteFindFirst },
  },
  withTenantScope: (tenantId: string, rest: object = {}) => ({
    tenant_id: tenantId,
    ...rest,
  }),
  normalizeLocale: (locale: string) => locale,
}));

vi.mock("@rewindom/builtin/marketing/shared/site-locale.js", () => ({
  withSiteLocale: (path: string) => path,
}));

vi.mock("../event/event.mapper.js", () => ({
  toEventDetail: vi.fn(),
  toEventListItem: vi.fn(),
}));

vi.mock("../event/entity.service.js", () => ({
  listEventEntities: vi.fn(),
}));

vi.mock("../event/related.service.js", () => ({
  listRelatedEvents: vi.fn(),
}));

vi.mock("../event/event-revision.service.js", () => ({
  listEventRevisions: vi.fn(),
  publicRevisionSince: vi.fn(() => new Date(0)),
}));

vi.mock("../event/topic-settings.service.js", () => ({
  getEnabledTopics: vi.fn(),
}));

const { getPublicEventBySlug, getPublicEventSitemapEntries } =
  await import("./public-events.service.js");
const { EVENT_TOPICS } = await import("../../shared/index.js");
const { getEnabledTopics } = await import("../event/topic-settings.service.js");

beforeEach(() => {
  vi.clearAllMocks();
  eventFindFirst.mockResolvedValue(null);
  eventFindMany.mockResolvedValue([]);
  siteFindFirst.mockResolvedValue({ default_locale: "en" });
  vi.mocked(getEnabledTopics).mockResolvedValue([...EVENT_TOPICS]);
});

describe("getPublicEventBySlug", () => {
  it("主题关掉后按 slug 也找不到——公开详情是 404，不是还能打开", async () => {
    vi.mocked(getEnabledTopics).mockResolvedValue(["ai", "tech"]);
    expect(await getPublicEventBySlug("t1", "sports-game-abc123")).toBeNull();
    expect(eventFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenant_id: "t1",
          slug: "sports-game-abc123",
          topic: { in: ["ai", "tech"] },
        },
      }),
    );
  });

  it("全开时不额外加 topic 条件", async () => {
    await getPublicEventBySlug("t1", "any-slug");
    expect(eventFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenant_id: "t1", slug: "any-slug" },
      }),
    );
  });
});

/*
 * sitemap 与详情页的 noindex 必须是同一个口径（见 `hasReaderValue` 的注释）：
 * 不一致会让爬虫在 sitemap 里拿到一批自称 noindex 的地址，比两边都不做更糟。
 * 这里钉住 SQL 镜像那一侧，TS 谓词那一侧在 shared/events.test.ts。
 */
describe("getPublicEventSitemapEntries", () => {
  it("薄页不进 sitemap，四条判据逐条对应 hasReaderValue", async () => {
    await getPublicEventSitemapEntries("t1");

    expect(eventFindMany.mock.calls[0][0].where.OR).toEqual([
      { signal_count: { gte: 2 } },
      { kind: { not: null } },
      { entities: { some: { is_publisher: false } } },
      {
        AND: [
          { analyzer: { in: ["llm", "manual"] } },
          { summary: { not: "" } },
        ],
      },
    ]);
  });

  /*
   * 出版方实体是采集源自己的标注——一手来源的事件生来就有一个，
   * `some: {}` 会让它们全部算成有增量（本地库 1454 个事件只有它）。
   */
  it("只有出版方实体的事件不算有增量", async () => {
    await getPublicEventSitemapEntries("t1");

    const entityClause = eventFindMany.mock.calls[0][0].where.OR[2];
    expect(entityClause).not.toEqual({ entities: { some: {} } });
  });

  /*
   * 过滤必须留在 where 里：take: 500 发生在过滤之前，事后再筛会让 sitemap
   * 只剩一两百条，而后面还排着真有内容的事件。
   */
  it("500 条上限之前就已经筛过", async () => {
    await getPublicEventSitemapEntries("t1");

    expect(eventFindMany.mock.calls[0][0].take).toBe(500);
    expect(eventFindMany.mock.calls[0][0].where.OR).toBeDefined();
  });
});

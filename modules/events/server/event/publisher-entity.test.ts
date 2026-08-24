import { describe, expect, it, vi, beforeEach } from "vitest";

const feedFindMany = vi.fn();

vi.mock("@rewindom/module-sdk/server", () => ({
  prisma: { eventFeed: { findMany: feedFindMany } },
  withTenantScope: (tenantId: string, rest: object = {}) => ({
    tenant_id: tenantId,
    ...rest,
  }),
}));

const { loadPublisherFeedIndex, resolvePublisherEntities } =
  await import("./publisher-entity.js");

beforeEach(() => {
  vi.clearAllMocks();
  feedFindMany.mockResolvedValue([
    {
      connector: "rss",
      name: "Cloudflare Status",
      publisher_entity_name: "Cloudflare",
      publisher_entity_kind: "company",
    },
    {
      connector: "rss",
      name: "Cloudflare Blog",
      publisher_entity_name: "Cloudflare",
      publisher_entity_kind: "company",
    },
  ]);
});

const signal = (over: Partial<Record<string, string>> = {}) => ({
  connector: "rss",
  source_name: "Cloudflare Status",
  source_kind: "status" as const,
  ...over,
});

describe("resolvePublisherEntities", () => {
  it("一手来源解析出出版方实体", async () => {
    const index = await loadPublisherFeedIndex("t1");
    expect(resolvePublisherEntities(index, [signal()])).toEqual([
      { name: "Cloudflare", kind: "company", mention_count: 1 },
    ]);
  });

  /*
   * 一篇 TechCrunch 报道不是「关于 TechCrunch」的。这道闸在解析这一层也要挡住，
   * 否则每个媒体都会长出一张实体聚合页。
   */
  it("news / community 信号一律跳过", () => {
    expect(
      resolvePublisherEntities(new Map(), [
        { connector: "rss", source_name: "TechCrunch", source_kind: "news" },
      ]),
    ).toEqual([]);
  });

  it("同一出版方的两条源合成一个实体，次数相加", async () => {
    const index = await loadPublisherFeedIndex("t1");
    expect(
      resolvePublisherEntities(index, [
        signal(),
        signal({ source_name: "Cloudflare Blog", source_kind: "official" }),
      ]),
    ).toEqual([{ name: "Cloudflare", kind: "company", mention_count: 2 }]);
  });

  it("源没标出版方时留空 —— 不从源名里猜", async () => {
    feedFindMany.mockResolvedValue([]);
    const index = await loadPublisherFeedIndex("t1");
    expect(resolvePublisherEntities(index, [signal()])).toEqual([]);
  });

  it("类型脏了退回 org，不猜", async () => {
    feedFindMany.mockResolvedValue([
      {
        connector: "rss",
        name: "Cloudflare Status",
        publisher_entity_name: "Cloudflare",
        publisher_entity_kind: "corporation",
      },
    ]);
    const index = await loadPublisherFeedIndex("t1");
    expect(resolvePublisherEntities(index, [signal()])).toEqual([
      { name: "Cloudflare", kind: "org", mention_count: 1 },
    ]);
  });

  /** 这份表每站点只查一次——放进按事件的循环等于每轮多几百次往返。 */
  it("索引一次查回，解析本身不发查询", async () => {
    const index = await loadPublisherFeedIndex("t1");
    expect(feedFindMany).toHaveBeenCalledTimes(1);
    resolvePublisherEntities(index, [signal(), signal()]);
    expect(feedFindMany).toHaveBeenCalledTimes(1);
  });
});

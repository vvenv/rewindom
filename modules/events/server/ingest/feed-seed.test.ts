import { describe, expect, it, vi, beforeEach } from "vitest";

const settingFindFirst = vi.fn();
const settingUpsert = vi.fn();
const feedFindMany = vi.fn();
const feedCreateMany = vi.fn();

vi.mock("@rewindom/module-sdk/server", () => ({
  prisma: {
    tenantSetting: { findFirst: settingFindFirst, upsert: settingUpsert },
    eventFeed: { findMany: feedFindMany, createMany: feedCreateMany },
  },
  withTenantScope: (tenantId: string, rest: object = {}) => ({
    tenant_id: tenantId,
    ...rest,
  }),
}));

vi.mock("../event/topic-settings.service.js", () => ({
  getEnabledTopics: vi.fn(),
}));

const { ensureDefaultFeeds, SEEDED_FEED_KEYS_SETTING } = await import("./feed-seed.js");
const { DEFAULT_FEEDS, feedCatalogKey } = await import("./feed-catalog.js");
const { EVENT_TOPICS } = await import("../../shared/index.js");
const { getEnabledTopics } = await import("../event/topic-settings.service.js");

const ALL_KEYS = DEFAULT_FEEDS.map(feedCatalogKey);

beforeEach(() => {
  vi.clearAllMocks();
  settingFindFirst.mockResolvedValue(null);
  feedFindMany.mockResolvedValue([]);
  feedCreateMany.mockResolvedValue({ count: 0 });
  settingUpsert.mockResolvedValue({});
  vi.mocked(getEnabledTopics).mockResolvedValue([...EVENT_TOPICS]);
});

function createdUrls(): string[] {
  return (feedCreateMany.mock.calls[0]?.[0].data ?? []).map(
    (row: { url: string }) => row.url,
  );
}

describe("ensureDefaultFeeds", () => {
  it("全新站点种入整份目录", async () => {
    const count = await ensureDefaultFeeds("t1");
    expect(count).toBe(DEFAULT_FEEDS.length);
    expect(createdUrls()).toHaveLength(DEFAULT_FEEDS.length);
  });

  it("种完把 key 记进 TenantSetting，下一轮不再重复种", async () => {
    await ensureDefaultFeeds("t1");
    const saved = settingUpsert.mock.calls[0][0];
    expect(saved.where.tenant_id_key.key).toBe(SEEDED_FEED_KEYS_SETTING);
    expect(saved.create.value).toEqual([...ALL_KEYS].sort());

    vi.clearAllMocks();
    settingFindFirst.mockResolvedValue({ value: ALL_KEYS });
    expect(await ensureDefaultFeeds("t1")).toBe(0);
    expect(feedCreateMany).not.toHaveBeenCalled();
  });

  /*
   * 这条是整个改动的要害：以前的口径是「只在空目录时新建」，
   * 于是扩充目录对**所有存量站点完全无效**——线上那个站早就有源了。
   */
  it("存量站点补上目录里新增的源", async () => {
    settingFindFirst.mockResolvedValue({ value: [ALL_KEYS[0], ALL_KEYS[1]] });
    const count = await ensureDefaultFeeds("t1");
    expect(count).toBe(DEFAULT_FEEDS.length - 2);
  });

  /*
   * 另一半同样要害：站点删掉 / 换掉的源不能被塞回来。
   * 存量站点没有种植记录时，把它当前已有的源全部视为「种过」，再补差集。
   */
  it("没有种植记录时，把现有源视为已种过，不复活站点删掉的默认源", async () => {
    // 站点只留了 Hacker News，其余初版默认源都删了
    const hn = DEFAULT_FEEDS[0];
    settingFindFirst.mockResolvedValue(null);
    feedFindMany.mockResolvedValue([{ connector: hn.connector, url: hn.url }]);

    await ensureDefaultFeeds("t1");

    // 只补目录里它从没见过的，且不会重新种 Hacker News
    expect(createdUrls()).not.toContain(hn.url);
    expect(createdUrls().length).toBe(DEFAULT_FEEDS.length - 1);
  });

  it("站点自己加过同地址的源时静默跳过，不报唯一键冲突", async () => {
    await ensureDefaultFeeds("t1");
    expect(feedCreateMany.mock.calls[0][0].skipDuplicates).toBe(true);
  });

  it("目录 key 由 connector + url 组成——改展示名不会让站点重新种一遍", () => {
    expect(feedCatalogKey({ connector: "rss", url: "https://a/feed" })).toBe(
      "rss:https://a/feed",
    );
  });

  it("关掉的 topic 不种、也不记已种——以后打开再补", async () => {
    vi.mocked(getEnabledTopics).mockResolvedValue(["ai", "tech"]);
    const count = await ensureDefaultFeeds("t1");
    const enabledFeeds = DEFAULT_FEEDS.filter(
      (feed) => feed.topic === "ai" || feed.topic === "tech",
    );
    expect(count).toBe(enabledFeeds.length);
    expect(createdUrls()).toEqual(enabledFeeds.map((feed) => feed.url));
    const saved = settingUpsert.mock.calls[0][0];
    expect(saved.create.value).toEqual(
      enabledFeeds.map(feedCatalogKey).sort(),
    );
  });
});

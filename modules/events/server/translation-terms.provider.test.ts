import { beforeEach, describe, expect, it, vi } from "vitest";

const groupBy = vi.fn();
const findMany = vi.fn();

vi.mock("@rewindom/module-sdk/server", () => ({
  prisma: {
    eventEntityLink: { groupBy },
    eventEntity: { findMany },
  },
}));

const { eventsTranslationTermsProvider, clearTranslationTermsCache } =
  await import("./translation-terms.provider.js");

function linked(rows: Array<[string, number]>) {
  return rows.map(([entity_id, sum]) => ({
    entity_id,
    _sum: { mention_count: sum },
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  clearTranslationTermsCache();
  groupBy.mockResolvedValue([]);
  findMany.mockResolvedValue([]);
});

describe("eventsTranslationTermsProvider", () => {
  it("按提及数供出实体名", async () => {
    groupBy.mockResolvedValue(linked([["a", 18], ["b", 5]]));
    findMany.mockResolvedValue([
      { id: "a", name: "Cloudflare" },
      { id: "b", name: "AWS" },
    ]);
    await expect(eventsTranslationTermsProvider.getKeepTerms("t1")).resolves.toEqual([
      "Cloudflare",
      "AWS",
    ]);
  });

  it("同名不同 kind 的实体只留一条", async () => {
    groupBy.mockResolvedValue(linked([["a", 7], ["b", 5]]));
    findMany.mockResolvedValue([
      { id: "a", name: "Trump" },
      { id: "b", name: "trump" },
    ]);
    await expect(eventsTranslationTermsProvider.getKeepTerms("t1")).resolves.toEqual([
      "Trump",
    ]);
  });

  it("单字符名字丢掉 —— 一个字的「术语」会命中满篇，反而毁掉译文", async () => {
    groupBy.mockResolvedValue(linked([["a", 9], ["b", 3]]));
    findMany.mockResolvedValue([
      { id: "a", name: "X" },
      { id: "b", name: "NVIDIA" },
    ]);
    await expect(eventsTranslationTermsProvider.getKeepTerms("t1")).resolves.toEqual([
      "NVIDIA",
    ]);
  });

  it("没有被事件引用过的实体不查第二次库", async () => {
    groupBy.mockResolvedValue([]);
    await expect(eventsTranslationTermsProvider.getKeepTerms("t1")).resolves.toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("按站点隔离查询", async () => {
    await eventsTranslationTermsProvider.getKeepTerms("t9");
    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenant_id: "t9" } }),
    );
  });

  /** 公开面每次加载都会问一次，没有缓存等于给每个访客的每一页加一次聚合查询。 */
  it("缓存：同一站点连问两次只打一次库", async () => {
    groupBy.mockResolvedValue(linked([["a", 1]]));
    findMany.mockResolvedValue([{ id: "a", name: "Cloudflare" }]);
    await eventsTranslationTermsProvider.getKeepTerms("t1");
    await eventsTranslationTermsProvider.getKeepTerms("t1");
    expect(groupBy).toHaveBeenCalledTimes(1);
  });

  it("缓存按站点分开，不串味", async () => {
    groupBy.mockResolvedValue(linked([["a", 1]]));
    findMany.mockResolvedValue([{ id: "a", name: "Cloudflare" }]);
    await eventsTranslationTermsProvider.getKeepTerms("t1");
    await eventsTranslationTermsProvider.getKeepTerms("t2");
    expect(groupBy).toHaveBeenCalledTimes(2);
  });
});

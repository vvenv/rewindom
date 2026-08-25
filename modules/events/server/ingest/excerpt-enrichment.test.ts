import { beforeEach, describe, expect, it, vi } from "vitest";

const signalFindMany = vi.fn();
const signalUpdate = vi.fn();
const eventUpdateMany = vi.fn();

vi.mock("@rewindom/module-sdk/server", () => ({
  prisma: {
    eventSignal: { findMany: signalFindMany, update: signalUpdate },
    newsEvent: { updateMany: eventUpdateMany },
  },
  withTenantScope: (tenantId: string, rest: object = {}) => ({
    tenant_id: tenantId,
    ...rest,
  }),
}));

vi.mock("./page-excerpt.js", async () => {
  const actual =
    await vi.importActual<typeof import("./page-excerpt.js")>(
      "./page-excerpt.js",
    );
  return { ...actual, fetchPageExcerpt: vi.fn() };
});

const { enrichStoredEmptyExcerpts } = await import("./excerpt-enrichment.js");
const { fetchPageExcerpt } = await import("./page-excerpt.js");

const NOW = new Date("2026-08-19T12:00:00Z");

function row(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "s1",
    url: "https://example.com/a",
    title: "Ferrari's first electric car",
    event_id: "e1",
    image_url: null,
    ...overrides,
  };
}

/** `fetchPageExcerpt` 现在一次返回摘录 + 配图（同一次抓取，不下载两遍）。 */
function extract(excerpt = "", image_url: string | null = null) {
  return { excerpt, image_url };
}

beforeEach(() => {
  vi.clearAllMocks();
  signalFindMany.mockResolvedValue([row()]);
  signalUpdate.mockResolvedValue({});
  eventUpdateMany.mockResolvedValue({ count: 1 });
});

function whereArg(): { fetched_at: { lt: Date } } {
  return signalFindMany.mock.calls[0][0].where;
}

describe("enrichStoredEmptyExcerpts", () => {
  it("只捞离上次尝试超过退避期的行", async () => {
    vi.mocked(fetchPageExcerpt).mockResolvedValue(extract());
    await enrichStoredEmptyExcerpts("t1", NOW);

    const cutoff = whereArg().fetched_at.lt;
    expect(NOW.getTime() - cutoff.getTime()).toBe(6 * 60 * 60 * 1000);
  });

  it("抓到可用摘录时写回，并把事件的 analyzed_at 清掉", async () => {
    vi.mocked(fetchPageExcerpt).mockResolvedValue(
      extract(
        "The 1965 Ferrari 250 LM sold for a record sum at auction in Monterey.",
      ),
    );

    const ids = await enrichStoredEmptyExcerpts("t1", NOW);

    expect(signalUpdate.mock.calls[0][0].data.excerpt).toContain("Ferrari");
    expect(ids).toEqual(["e1"]);
    expect(eventUpdateMany.mock.calls[0][0].data).toEqual({
      analyzed_at: null,
    });
    // 已有 LLM / 人工摘要的不能置空——那会绕过冷却再付一次钱
    expect(eventUpdateMany.mock.calls[0][0].where.analyzer).toEqual({
      notIn: ["llm", "manual"],
    });
  });

  /**
   * 省钱的关键一条：抓失败也要记一笔时间。不记的话，付费墙 / 机器人墙这类
   * 永远抓不出摘录的 URL 会每 15 分钟被重抓一次，一天 96 遍。
   */
  it("抓失败也推进 fetched_at，不再每轮重抓", async () => {
    vi.mocked(fetchPageExcerpt).mockRejectedValue(new Error("HTTP 403"));

    const ids = await enrichStoredEmptyExcerpts("t1", NOW);

    expect(signalUpdate).toHaveBeenCalledTimes(1);
    expect(signalUpdate.mock.calls[0][0].data).toEqual({ fetched_at: NOW });
    expect(ids).toEqual([]);
    expect(eventUpdateMany).not.toHaveBeenCalled();
  });

  it("抓回来的是站点口号这类没用的文本时不写 excerpt，只推进时间", async () => {
    vi.mocked(fetchPageExcerpt).mockResolvedValue(extract());

    await enrichStoredEmptyExcerpts("t1", NOW);

    expect(signalUpdate.mock.calls[0][0].data).toEqual({ fetched_at: NOW });
  });

  it("抓不了的 URL（PDF / HN 讨论页）连请求都不发", async () => {
    signalFindMany.mockResolvedValue([
      row({ url: "https://news.ycombinator.com/item?id=1" }),
    ]);

    await enrichStoredEmptyExcerpts("t1", NOW);

    expect(fetchPageExcerpt).not.toHaveBeenCalled();
    expect(signalUpdate).not.toHaveBeenCalled();
  });
});

/*
 * 配图与摘录走同一次抓取。图这一列是后加的，存量信号全是 null——所以这道回填
 * 上线后会把语料过一遍（每轮 40 条 + 6 小时退避，自然收敛）。
 */
describe("enrichStoredEmptyExcerpts · 配图", () => {
  it("把目标页的图一起写回", async () => {
    vi.mocked(fetchPageExcerpt).mockResolvedValue(
      extract("", "https://cdn.example.com/hero.jpg"),
    );

    await enrichStoredEmptyExcerpts("t1", NOW);

    expect(signalUpdate.mock.calls[0][0].data.image_url).toBe(
      "https://cdn.example.com/hero.jpg",
    );
  });

  /* feed 自带的图跟条目绑定，比页面级 og:image 更贴这一篇——不许覆盖。 */
  it("已经有图的不覆盖", async () => {
    signalFindMany.mockResolvedValue([
      row({ image_url: "https://cdn.example.com/from-feed.jpg" }),
    ]);
    vi.mocked(fetchPageExcerpt).mockResolvedValue(
      extract("", "https://cdn.example.com/from-page.jpg"),
    );

    await enrichStoredEmptyExcerpts("t1", NOW);

    expect(signalUpdate.mock.calls[0][0].data.image_url).toBeUndefined();
  });

  /* 缺图也值得抓一次——同一个页面同一次请求就能补齐两样。 */
  it("缺摘录或缺图都进候选", async () => {
    await enrichStoredEmptyExcerpts("t1", NOW);

    expect(signalFindMany.mock.calls[0][0].where.OR).toEqual([
      { excerpt: "" },
      { image_url: null },
    ]);
  });

  it("抓失败时不写 image_url，只推进时间", async () => {
    vi.mocked(fetchPageExcerpt).mockRejectedValue(new Error("HTTP 403"));

    await enrichStoredEmptyExcerpts("t1", NOW);

    expect(signalUpdate.mock.calls[0][0].data).toEqual({ fetched_at: NOW });
  });
});

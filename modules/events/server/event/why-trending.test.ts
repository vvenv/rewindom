import { describe, expect, it } from "vitest";

import { computeWhyTrending, type WhyTrendingSignal } from "./why-trending.js";

const NOW = new Date("2026-08-18T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000);

function signal(over: Partial<WhyTrendingSignal> = {}): WhyTrendingSignal {
  return {
    source_name: "Hacker News",
    source_kind: "community",
    published_at: hoursAgo(1),
    ...over,
  };
}

const codes = (s: readonly WhyTrendingSignal[]) =>
  computeWhyTrending({ signals: s, now: NOW }).map((f) => f.code);

describe("computeWhyTrending", () => {
  it("没有信号时什么都不说", () => {
    expect(computeWhyTrending({ signals: [], now: NOW })).toEqual([]);
  });

  /*
   * 单条社区信号**必须**给出「仅讨论」的警示。
   *
   * 曾经把它压掉，理由是「一条信号没什么可讲」。但真实语料上量过：
   * 整个语料里没有一个纯社区来源的多信号事件（HN 帖子之间极少聚到一起），
   * 压掉单条就等于这条警示永远不出现——而线上首页 16 张卡有 13 张正是单来源 HN。
   */
  it("单条社区信号也要标「仅讨论」——最该提醒的就是它", () => {
    const result = computeWhyTrending({ signals: [signal()], now: NOW });
    expect(result.map((f) => f.code)).toEqual(["why.communityOnly"]);
    expect(result[0].confidence).toBe("discussion");
  });

  it("单独一篇新闻稿没什么「扩散」可讲，留白", () => {
    expect(
      codes([signal({ source_name: "BBC", source_kind: "news" })]),
    ).toEqual([]);
  });

  it("一手来源发布公告是最强的一条，排最前", () => {
    const result = computeWhyTrending({
      signals: [
        signal({ source_name: "OpenAI", source_kind: "official", published_at: hoursAgo(3) }),
        signal({ source_name: "TechCrunch", source_kind: "news", published_at: hoursAgo(2) }),
      ],
      now: NOW,
    });
    expect(result[0].code).toBe("why.officialAnnouncement");
    expect(result[0].params.source).toBe("OpenAI");
    expect(result[0].confidence).toBe("confirmed");
  });

  it("跨源印证带上家数与最先报道的那家", () => {
    const result = computeWhyTrending({
      signals: [
        signal({ source_name: "BBC", source_kind: "news", published_at: hoursAgo(5) }),
        signal({ source_name: "Reuters", source_kind: "news", published_at: hoursAgo(2) }),
      ],
      now: NOW,
    });
    const cross = result.find((f) => f.code === "why.crossSource")!;
    expect(cross.params).toMatchObject({ count: 2, first: "BBC" });
    expect(cross.confidence).toBe("confirmed");
  });

  /*
   * 这条区分是整个功能存在的理由。混为一谈就变成了「热度解释器」，
   * 而那正是产品要避免的东西（MVP §11：不判断谁对，把讨论标成讨论）。
   */
  it("只有社区来源时一律是 discussion——哪怕十条帖子", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      signal({ source_name: `HN ${i}`, published_at: hoursAgo(2) }),
    );
    const result = computeWhyTrending({ signals: many, now: NOW });
    expect(result.every((f) => f.confidence === "discussion")).toBe(true);
    expect(result.map((f) => f.code)).toContain("why.communityOnly");
  });

  it("有一手来源就算 confirmed，即便只有一条信号", () => {
    const result = computeWhyTrending({
      signals: [signal({ source_name: "OpenAI", source_kind: "official" })],
      now: NOW,
    });
    expect(result.map((f) => f.code)).toEqual(["why.officialAnnouncement"]);
    expect(result[0].confidence).toBe("confirmed");
  });

  it("近窗新增量带上条数、来源数与窗口长度", () => {
    const result = computeWhyTrending({
      signals: [
        signal({ source_name: "BBC", source_kind: "news", published_at: hoursAgo(20) }),
        signal({ source_name: "Reuters", source_kind: "news", published_at: hoursAgo(1) }),
        signal({ source_name: "AP", source_kind: "news", published_at: hoursAgo(2) }),
      ],
      now: NOW,
    });
    const recent = result.find((f) => f.code === "why.recentActivity")!;
    expect(recent.params).toMatchObject({ count: 2, sources: 2, hours: 6 });
  });

  /*
   * 一条信号不是「活动」，那就是这个事件本身。
   * 对一条一手公告说「最近 6 小时新增 1 条」是同一件事说两遍。
   */
  it("近窗只有一条信号时不写「正在扩散」", () => {
    expect(
      codes([
        signal({ source_name: "OpenAI", source_kind: "official", published_at: hoursAgo(1) }),
      ]),
    ).toEqual(["why.officialAnnouncement"]);
  });

  it("近窗没有任何动静时不写「正在扩散」", () => {
    expect(
      codes([
        signal({ source_name: "BBC", source_kind: "news", published_at: hoursAgo(30) }),
        signal({ source_name: "Reuters", source_kind: "news", published_at: hoursAgo(28) }),
      ]),
    ).not.toContain("why.recentActivity");
  });

  it("最多四条——再多就不是「为什么」而是一份报表", () => {
    const result = computeWhyTrending({
      signals: [
        signal({ source_name: "OpenAI", source_kind: "official", published_at: hoursAgo(3) }),
        signal({ source_name: "TechCrunch", source_kind: "news", published_at: hoursAgo(2) }),
        signal({ source_name: "HN", source_kind: "community", published_at: hoursAgo(1) }),
      ],
      now: NOW,
    });
    expect(result.length).toBeLessThanOrEqual(4);
  });

  /*
   * 产出必须是 code + 参数，不是自由文案。允许自由文案，就会出现
   * 「因为开发者社区普遍担忧」这种没有出处的句子。
   */
  it("产出的是 i18n code 与参数，不含自由文案", () => {
    for (const f of computeWhyTrending({
      signals: [
        signal({ source_name: "OpenAI", source_kind: "official" }),
        signal({ source_name: "TechCrunch", source_kind: "news" }),
      ],
      now: NOW,
    })) {
      expect(f.code).toMatch(/^why\./u);
      expect(typeof f.params).toBe("object");
    }
  });
});

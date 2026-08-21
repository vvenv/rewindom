import { describe, expect, it } from "vitest";

import {
  buildHeadline,
  groupSources,
  toEventListItem,
  type EventRecordForList,
  type SignalRecord,
} from "./event.mapper.js";

function record(overrides: Partial<EventRecordForList> = {}): EventRecordForList {
  return {
    id: "e1",
    slug: "gpt-6-abc123",
    title: "OpenAI releases GPT-6",
    summary: "OpenAI released GPT-6 today. It supports realtime video.",
    topic: "ai",
    status: "developing",
    heat_score: 12.5,
    velocity_pct: 420,
    has_velocity_baseline: true,
    recent_signal_count: 5,
    recent_source_count: 3,
    signal_count: 9,
    source_count: 4,
    source_names: ["OpenAI", "Hacker News"],
    source_kinds: ["official", "community"],
    kind: null,
    fact_version: null,
    fact_amount_text: null,
    fact_amount_usd: null,
    fact_duration_minutes: null,
    fact_resolved: null,
    first_seen_at: new Date("2025-08-12T10:02:00Z"),
    last_activity_at: new Date("2025-08-12T12:15:00Z"),
    ...overrides,
  };
}

describe("toEventListItem", () => {
  it("时间统一序列化成 ISO 串", () => {
    const item = toEventListItem(record());
    expect(item.first_seen_at).toBe("2025-08-12T10:02:00.000Z");
    expect(item.last_activity_at).toBe("2025-08-12T12:15:00.000Z");
  });

  it("来源 icon 走本站路径，不拼第三方 CDN", () => {
    const icons = new Map([
      ["OpenAI", "/events/icons/openai.com"],
      ["Hacker News", "/events/icons/news.ycombinator.com"],
    ]);
    const item = toEventListItem(record(), null, icons);
    expect(item.source_icon_urls).toEqual([
      "/events/icons/openai.com",
      "/events/icons/news.ycombinator.com",
    ]);
    expect(item.source_icon_urls.join("")).not.toContain("google.com");
  });

  it("来源类型过滤未知值，归位默认为空", () => {
    const item = toEventListItem(
      record({ source_kinds: ["news", "mystery"] }),
    );
    expect(item.source_kinds).toEqual(["news"]);
    expect(item.placement).toEqual([]);
  });

  it("没有关注记录时既未关注也没有更新", () => {
    const item = toEventListItem(record(), null);
    expect(item.is_following).toBe(false);
    expect(item.has_update).toBe(false);
  });

  it("关注后、上次查看之后又有动静 → has_update", () => {
    const item = toEventListItem(record(), {
      last_seen_at: new Date("2025-08-12T11:00:00Z"),
    });
    expect(item.is_following).toBe(true);
    expect(item.has_update).toBe(true);
  });

  it("看过之后没有新动静 → 已关注但无更新", () => {
    const item = toEventListItem(record(), {
      last_seen_at: new Date("2025-08-12T13:00:00Z"),
    });
    expect(item.is_following).toBe(true);
    expect(item.has_update).toBe(false);
  });
});

describe("buildHeadline", () => {
  it("取摘要的第一句", () => {
    expect(buildHeadline("It shipped today. More details follow.", "T")).toBe(
      "It shipped today.",
    );
  });

  it("中文句号同样断句", () => {
    expect(buildHeadline("今天发布了。随后会有更多细节。", "T")).toBe("今天发布了。");
  });

  it("摘要为空时不编造副标题", () => {
    expect(buildHeadline("   ", "OpenAI releases GPT-6")).toBe("");
  });

  it("第一句就是标题时留空", () => {
    expect(buildHeadline("OpenAI releases GPT-6.", "OpenAI releases GPT-6")).toBe(
      "",
    );
  });

  it("第一句就是标题时改取后面一句", () => {
    expect(
      buildHeadline(
        "OpenAI releases GPT-6. It supports realtime video.",
        "OpenAI releases GPT-6",
      ),
    ).toBe("It supports realtime video.");
  });

  it("过长时截断并加省略号", () => {
    const headline = buildHeadline("x".repeat(400), "T");
    expect(headline.length).toBeLessThanOrEqual(160);
    expect(headline.endsWith("…")).toBe(true);
  });
});

describe("groupSources", () => {
  const signals: SignalRecord[] = [
    {
      id: "s1",
      title: "Announcement",
      url: "https://openai.com/a",
      source_name: "OpenAI",
      source_kind: "official",
      published_at: new Date("2025-08-12T10:02:00Z"),
      score: 0,
      comment_count: 0,
    },
    {
      id: "s2",
      title: "Thread",
      url: "https://news.ycombinator.com/item?id=1",
      source_name: "Hacker News",
      source_kind: "community",
      published_at: new Date("2025-08-12T10:17:00Z"),
      score: 300,
      comment_count: 120,
    },
  ];

  it("按 official / news / community 分组", () => {
    const grouped = groupSources(signals);
    expect(grouped.official.map((s) => s.id)).toEqual(["s1"]);
    expect(grouped.community.map((s) => s.id)).toEqual(["s2"]);
  });

  it("HN 信号即使 URL 是目标站也画 HN 的标", () => {
    const grouped = groupSources([
      {
        ...signals[1]!,
        connector: "hackernews",
        url: "https://openai.com/blog/gpt",
      },
    ]);
    expect(grouped.community[0]?.icon_url).toBe(
      "/events/icons/news.ycombinator.com",
    );
  });

  // 每个键都必须在——公开面直接 `sources[kind].map`，缺一个就在 undefined 上炸
  it("每个来源类型都有一格，空组为空数组", () => {
    expect(groupSources([])).toEqual({
      official: [],
      release: [],
      status: [],
      filing: [],
      news: [],
      community: [],
    });
  });

  it("忽略未知的 source_kind，而不是让它污染分组", () => {
    const grouped = groupSources([
      { ...signals[0], id: "s9", source_kind: "unknown" },
    ]);
    expect(grouped.official).toHaveLength(0);
    expect(grouped.news).toHaveLength(0);
    expect(grouped.community).toHaveLength(0);
  });
});

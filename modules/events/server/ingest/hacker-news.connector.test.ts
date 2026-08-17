import { describe, expect, it } from "vitest";

import { toSignal } from "./hacker-news.connector.js";

import type { ConnectorFeed } from "./connector.js";

const FEED: ConnectorFeed = {
  id: "feed-1",
  connector: "hackernews",
  name: "Hacker News",
  url: "https://hacker-news.firebaseio.com/v0",
  source_kind: "community",
  topic: "tech",
};

describe("hacker-news toSignal", () => {
  it("映射常规条目", () => {
    const signal = toSignal(
      {
        id: 42,
        title: "  Show HN: a thing  ",
        url: "https://example.com/thing",
        score: 120,
        descendants: 33,
        by: "ada",
        time: 1_755_000_000,
      },
      FEED,
    );

    expect(signal).toMatchObject({
      external_id: "42",
      title: "Show HN: a thing",
      url: "https://example.com/thing",
      score: 120,
      comment_count: 33,
      author: "ada",
      source_kind: "community",
      topic: "tech",
    });
    expect(signal?.excerpt).toBe("");
    expect(signal?.published_at.toISOString()).toBe("2025-08-12T12:00:00.000Z");
  });

  it("Ask / Show 自帖把 text 剥成摘录", () => {
    const signal = toSignal(
      {
        id: 9,
        title: "Ask HN: why?",
        text: "<p>Looking for a <b>faster</b> way to ship.</p>",
        time: 1,
      },
      FEED,
    );
    expect(signal?.excerpt).toBe("Looking for a faster way to ship.");
  });

  it("没有外链的自帖指回 HN 讨论页", () => {
    expect(toSignal({ id: 7, title: "Ask HN: why?", time: 1 }, FEED)?.url).toBe(
      "https://news.ycombinator.com/item?id=7",
    );
  });

  it("已删除 / 已屏蔽 / 无标题的条目被丢弃", () => {
    expect(toSignal({ id: 1, title: "x", deleted: true }, FEED)).toBeNull();
    expect(toSignal({ id: 1, title: "x", dead: true }, FEED)).toBeNull();
    expect(toSignal({ id: 1, title: "   " }, FEED)).toBeNull();
    expect(toSignal({ title: "no id" }, FEED)).toBeNull();
  });

  it("缺失的计数按 0 处理，而不是 undefined 落库", () => {
    const signal = toSignal({ id: 3, title: "t", time: 1 }, FEED);
    expect(signal?.score).toBe(0);
    expect(signal?.comment_count).toBe(0);
  });
});

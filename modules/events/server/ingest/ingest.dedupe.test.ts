import { describe, expect, it } from "vitest";

import { dedupeSignalsByIdentity } from "./ingest.service.js";

import type { RawSignal } from "./connector.js";

function signal(overrides: Partial<RawSignal> = {}): RawSignal {
  return {
    external_id: "id-1",
    source_name: "BBC World",
    source_kind: "news",
    title: "Ferrari's first ever electric car sold for record $40m at auction",
    url: "https://www.bbc.co.uk/news/articles/c77ggpgrp2do?at_medium=RSS&at_campaign=rss",
    excerpt: "",
    author: null,
    topic: "world",
    score: 0,
    comment_count: 0,
    published_at: new Date("2026-08-17T02:22:04Z"),
    ...overrides,
  };
}

describe("dedupeSignalsByIdentity", () => {
  /**
   * 真实回归：BBC 的 RSS guid 带 `#0`/`#1` 修订号，同一篇文章更新后会以新 guid 再出现。
   * 按 guid 去重时，同一篇报道在事件时间线上占了两格、字字相同。
   */
  it("源给同一篇文章换了 guid 时只保留一条", () => {
    const result = dedupeSignalsByIdentity([
      signal({
        external_id: "https://www.bbc.co.uk/news/articles/c77ggpgrp2do#0",
      }),
      signal({
        external_id: "https://www.bbc.co.uk/news/articles/c77ggpgrp2do#1",
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].signal.external_id).toBe(
      "https://www.bbc.co.uk/news/articles/c77ggpgrp2do#0",
    );
    // 身份用的是剥掉追踪参数与锚点之后的规范化 URL
    expect(result[0].canonical_url).toBe(
      "https://bbc.co.uk/news/articles/c77ggpgrp2do",
    );
  });

  it("追踪参数不同、其实是同一篇 → 一条", () => {
    const result = dedupeSignalsByIdentity([
      signal({ external_id: "a", url: "https://example.com/x?utm_source=rss" }),
      signal({ external_id: "b", url: "https://example.com/x?utm_source=twitter" }),
    ]);
    expect(result).toHaveLength(1);
  });

  it("**不同来源**指向同一篇原文要保留两条——那正是跨源印证的证据", () => {
    const result = dedupeSignalsByIdentity([
      signal({ external_id: "bbc-1", source_name: "BBC World" }),
      signal({
        external_id: "hn-1",
        source_name: "Hacker News",
        source_kind: "community",
      }),
    ]);
    expect(result).toHaveLength(2);
    expect(result.map((item) => item.signal.source_name)).toEqual([
      "BBC World",
      "Hacker News",
    ]);
    // 两条的 canonical_url 相同 —— 聚类正是靠它把两条并进同一个事件
    expect(result[0].canonical_url).toBe(result[1].canonical_url);
  });

  it("同一来源的不同文章各自保留", () => {
    const result = dedupeSignalsByIdentity([
      signal({ external_id: "a", url: "https://example.com/one" }),
      signal({ external_id: "b", url: "https://example.com/two" }),
    ]);
    expect(result).toHaveLength(2);
  });

  it("空输入返回空数组", () => {
    expect(dedupeSignalsByIdentity([])).toEqual([]);
  });
});

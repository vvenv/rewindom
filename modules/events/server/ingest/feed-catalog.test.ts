import { describe, expect, it } from "vitest";

import { EVENT_TOPICS } from "../../shared/index.js";

import { DEFAULT_FEEDS, feedCatalogKey } from "./feed-catalog.js";

describe("DEFAULT_FEEDS", () => {
  it("每个目录项的 key 唯一——重复 URL 会让种植记账对不上", () => {
    const keys = DEFAULT_FEEDS.map(feedCatalogKey);
    expect(keys).toEqual([...new Set(keys)]);
  });

  it("每个 topic 至少 3 个源，ai / tech / business 更密，其余四格也能跨源印证", () => {
    const counts = Object.fromEntries(
      EVENT_TOPICS.map((topic) => [
        topic,
        DEFAULT_FEEDS.filter((feed) => feed.topic === topic).length,
      ]),
    ) as Record<(typeof EVENT_TOPICS)[number], number>;

    for (const topic of EVENT_TOPICS) {
      expect(counts[topic], topic).toBeGreaterThanOrEqual(3);
    }
    expect(counts.ai).toBeGreaterThanOrEqual(10);
    expect(counts.tech).toBeGreaterThanOrEqual(18);
    expect(counts.business).toBeGreaterThanOrEqual(8);
    expect(counts.world).toBeGreaterThanOrEqual(8);
    expect(counts.gaming).toBeGreaterThanOrEqual(8);
    expect(counts.entertainment).toBeGreaterThanOrEqual(6);
    expect(counts.sports).toBeGreaterThanOrEqual(6);
  });
});

import { describe, expect, it } from "vitest";

import { HACKER_NEWS_API_ROOT } from "../ingest/feed-catalog.js";

import {
  FeedValidationError,
  normalizeFeedCreate,
  normalizeFeedUpdate,
} from "./feed.util.js";

describe("normalizeFeedCreate", () => {
  it("hackernews 不读调用方给的 url，固定用内置端点", () => {
    const feed = normalizeFeedCreate({
      connector: "hackernews",
      name: "HN",
      url: "https://example.com/ignored",
      source_kind: "community",
      topic: "tech",
    });
    expect(feed.url).toBe(HACKER_NEWS_API_ROOT);
    expect(feed.connector).toBe("hackernews");
  });

  it("rss 必须是 http(s) 地址", () => {
    expect(() =>
      normalizeFeedCreate({
        connector: "rss",
        name: "X",
        url: "ftp://example.com/feed.xml",
        source_kind: "news",
        topic: "tech",
      }),
    ).toThrow(FeedValidationError);
  });

  it("缺名字时报 feed_name_required", () => {
    try {
      normalizeFeedCreate({
        connector: "rss",
        name: "  ",
        url: "https://example.com/feed.xml",
        source_kind: "news",
        topic: "tech",
      });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(FeedValidationError);
      expect((err as FeedValidationError).code).toBe("events.feed_name_required");
    }
  });
});

describe("normalizeFeedUpdate", () => {
  it("只改 enabled 时不动其它字段", () => {
    expect(
      normalizeFeedUpdate({ enabled: false }, {
        connector: "rss",
        url: "https://example.com/feed.xml",
      }),
    ).toEqual({ enabled: false });
  });
});

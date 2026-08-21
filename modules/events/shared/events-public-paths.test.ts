import { describe, expect, it } from "vitest";

import {
  EVENTS_FEED_HREF_TEMPLATE,
  entityFeedPath,
  entityIndexPath,
  entityPath,
  eventOgImagePath,
  eventPath,
  eventsFeedPath,
  eventsHubPath,
  eventsIndexHref,
  eventsReservedSlugs,
  isEventsIndexListing,
  isEventsPath,
  isEventsRootQueryTakeover,
  parseEventsIndexQuery,
  parseEventsPublicPath,
  sourceIconPath,
  topicPath,
  withEventsPrefix,
} from "./events-public-paths.js";

describe("typed public paths", () => {
  it("empty prefix sits at site root", () => {
    expect(eventsHubPath()).toBe("/");
    expect(topicPath("ai")).toBe("/topics/ai");
    expect(eventPath("foo-abc123")).toBe("/events/foo-abc123");
    expect(entityIndexPath()).toBe("/entities");
    expect(entityPath("openai")).toBe("/entities/openai");
    expect(eventsFeedPath()).toBe("/feed.xml");
    expect(eventsFeedPath("ai")).toBe("/topics/ai/feed.xml");
    expect(entityFeedPath("openai")).toBe("/entities/openai/feed.xml");
    expect(eventOgImagePath("foo-abc123")).toBe("/events/foo-abc123/og.png");
    expect(sourceIconPath("openai.com")).toBe("/events/icons/openai.com");
  });

  it("module prefix wraps collection paths, not home", () => {
    expect(withEventsPrefix("/topics/ai", "radar")).toBe("/radar/topics/ai");
    expect(eventsHubPath("radar")).toBe("/radar");
    expect(topicPath("ai", "radar")).toBe("/radar/topics/ai");
    expect(eventPath("foo-abc123", "radar")).toBe("/radar/events/foo-abc123");
    expect(eventsFeedPath(undefined, "radar")).toBe("/radar/feed.xml");
    expect(eventsReservedSlugs("radar")).toEqual(["radar"]);
    expect(eventsReservedSlugs()).toEqual(["topics", "events", "entities"]);
  });

  it("listing hrefs: hub is /, topics are /topics/:slug", () => {
    expect(eventsIndexHref()).toBe("/");
    expect(eventsIndexHref({ source: "rising" })).toBe("/?source=rising");
    expect(eventsIndexHref({ topic: "ai" })).toBe("/topics/ai");
    expect(eventsIndexHref({ source: "rising", topic: "ai" })).toBe(
      "/topics/ai?source=rising",
    );
  });

  it("subscribe default is the {feed} token", () => {
    expect(EVENTS_FEED_HREF_TEMPLATE).toBe("{feed}");
  });
});

describe("parseEventsPublicPath", () => {
  it("认类型化集合，不认旧枢纽 / 根上单段", () => {
    expect(parseEventsPublicPath("/topics/ai")).toEqual({
      type: "topic",
      topic: "ai",
    });
    expect(parseEventsPublicPath("/events/foo-abc123")).toEqual({
      type: "event",
      slug: "foo-abc123",
    });
    expect(parseEventsPublicPath("/entities")).toEqual({
      type: "entity_index",
    });
    expect(parseEventsPublicPath("/entities/openai")).toEqual({
      type: "entity",
      slug: "openai",
    });
    expect(parseEventsPublicPath("/feed.xml")).toEqual({ type: "feed" });
    expect(parseEventsPublicPath("/topics/ai/feed.xml")).toEqual({
      type: "feed",
      topic: "ai",
    });
    expect(parseEventsPublicPath("/entities/openai/feed.xml")).toEqual({
      type: "entity_feed",
      slug: "openai",
    });
    expect(parseEventsPublicPath("/events/foo-abc123/og.png")).toEqual({
      type: "og_image",
      slug: "foo-abc123",
    });
    expect(parseEventsPublicPath("/events/icons/openai.com")).toEqual({
      type: "source_icon",
      host: "openai.com",
    });

    expect(parseEventsPublicPath("/")).toBeNull();
    expect(parseEventsPublicPath("/events")).toBeNull();
    expect(parseEventsPublicPath("/events/ai")).toEqual({
      type: "event",
      slug: "ai",
    });
    expect(parseEventsPublicPath("/ai")).toBeNull();
    expect(parseEventsPublicPath("/events/entities/openai")).toBeNull();
    expect(parseEventsPublicPath("/topics")).toBeNull();
    expect(parseEventsPublicPath("/events/foo-abc123/feed.xml")).toBeNull();
    expect(parseEventsPublicPath("/topics/ai/og.png")).toBeNull();
    expect(parseEventsPublicPath("/events/icons/localhost")).toBeNull();
    expect(parseEventsPublicPath("/events/icons/not a host")).toBeNull();
  });

  it("isEventsPath 与解析同一条", () => {
    expect(isEventsPath("/topics/ai")).toBe(true);
    expect(isEventsPath("/events/foo-abc123")).toBe(true);
    expect(isEventsPath("/feed.xml")).toBe(true);
    expect(isEventsPath("/events/icons/openai.com")).toBe(true);
    expect(isEventsPath("/events")).toBe(false);
    expect(isEventsPath("/ai")).toBe(false);
  });
});

describe("parseEventsIndexQuery", () => {
  it("只认合法的 source / topic", () => {
    expect(
      parseEventsIndexQuery({ source: "rising", topic: "ai" }),
    ).toEqual({ source: "rising", topic: "ai" });
    expect(parseEventsIndexQuery({ source: "hot", topic: "all" })).toEqual({
      source: undefined,
      topic: undefined,
    });
    expect(parseEventsIndexQuery({ source: "today" })).toEqual({
      source: "now",
      topic: undefined,
    });
  });
});

describe("isEventsIndexListing", () => {
  it("有 source 才是列表页", () => {
    expect(isEventsIndexListing({ source: "rising" })).toBe(true);
    expect(isEventsIndexListing({ topic: "ai" })).toBe(false);
  });
});

describe("isEventsRootQueryTakeover", () => {
  it("枢纽路径带合法 source 即接管，不看首页版式", () => {
    expect(isEventsRootQueryTakeover("/", { source: "now" })).toBe(true);
    expect(isEventsRootQueryTakeover("/", { source: "rising" })).toBe(true);
    expect(isEventsRootQueryTakeover("/", { source: "today" })).toBe(true);
    expect(isEventsRootQueryTakeover("/", { source: "hot" })).toBe(false);
    expect(isEventsRootQueryTakeover("/", { topic: "ai" })).toBe(false);
    expect(isEventsRootQueryTakeover("/", { kind: "release" })).toBe(false);
    expect(isEventsRootQueryTakeover("/", {})).toBe(false);
    expect(isEventsRootQueryTakeover("/topics/ai", { source: "now" })).toBe(
      false,
    );
  });
});

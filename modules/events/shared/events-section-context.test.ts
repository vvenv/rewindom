import { describe, expect, it } from "vitest";

import {
  EVENTS_INDEX_PATH,
  eventsCanonicalLocation,
  eventsIndexHref,
  eventsIndexPath,
  eventsMountedAtRoot,
  eventPath,
  eventOgImagePath,
  eventsFeedPath,
  entityFeedPath,
  entityPath,
  isEventsIndexListing,
  entityIndexPath,
  isEventsPath,
  isEventsRootFallbackPath,
  isEventsRootQueryTakeover,
  parseEventsIndexQuery,
  parseEventsPublicPath,
  parseEventsRequestPath,
  stripEventsMountedPrefix,
} from "./events-section-context.js";

describe("eventsIndexHref", () => {
  it("没有查询时就是枢纽地址", () => {
    expect(eventsIndexHref()).toBe(EVENTS_INDEX_PATH);
    expect(eventsIndexHref({})).toBe("/events");
  });

  it("带 source，枢纽与列表才能分开", () => {
    expect(eventsIndexHref({ source: "rising" })).toBe("/events?source=rising");
    expect(eventsIndexHref({ source: "now" })).toBe("/events?source=now");
  });

  it("主题是路径段，source 仍是查询", () => {
    expect(eventsIndexHref({ source: "rising", topic: "ai" })).toBe(
      "/events/ai?source=rising",
    );
    expect(eventsIndexHref({ topic: "tech" })).toBe("/events/tech");
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
    expect(parseEventsIndexQuery({})).toEqual({
      source: undefined,
      topic: undefined,
    });
  });
});

describe("isEventsIndexListing", () => {
  it("有 source 才是列表页", () => {
    expect(isEventsIndexListing({ source: "rising" })).toBe(true);
    expect(isEventsIndexListing({ topic: "ai" })).toBe(false);
    expect(isEventsIndexListing({})).toBe(false);
  });
});

describe("eventsMountedAtRoot", () => {
  it("存量 home_path=/events 仍算挂在根上", () => {
    expect(eventsMountedAtRoot({ homePath: "/events" })).toBe(true);
    expect(eventsMountedAtRoot({ homePath: "/events/" })).toBe(true);
    expect(eventsMountedAtRoot({ homePath: "/" })).toBe(false);
    expect(eventsMountedAtRoot({ homePath: "/shop" })).toBe(false);
    expect(eventsMountedAtRoot({})).toBe(false);
  });

  it("选了事件雷达版式且首页是 / 时挂在根上", () => {
    expect(
      eventsMountedAtRoot({
        homePath: "/",
        homeLayoutKey: "events.home",
      }),
    ).toBe(true);
    expect(
      eventsMountedAtRoot({
        homePath: "/shop",
        homeLayoutKey: "events.home",
      }),
    ).toBe(false);
    expect(
      eventsMountedAtRoot({
        homePath: "/",
        homeLayoutKey: "marketing.default",
      }),
    ).toBe(false);
  });
});

describe("isEventsRootQueryTakeover", () => {
  it("只在挂到根上且带 source/topic 时接管 /", () => {
    const mount = { homePath: "/", homeLayoutKey: "events.home" };
    expect(isEventsRootQueryTakeover("/", { source: "now" }, mount)).toBe(
      true,
    );
    expect(isEventsRootQueryTakeover("/", { topic: "ai" }, mount)).toBe(true);
    expect(isEventsRootQueryTakeover("/", {}, mount)).toBe(false);
    expect(
      isEventsRootQueryTakeover("/", { source: "now" }, { homePath: "/" }),
    ).toBe(false);
    expect(
      isEventsRootQueryTakeover(
        "/events",
        { source: "now" },
        mount,
      ),
    ).toBe(false);
  });
});

describe("public paths at root", () => {
  it("枢纽、详情、实体都去掉 /events", () => {
    expect(eventsIndexPath({ homePath: "/events" })).toBe("/");
    expect(eventPath("foo-abc123", "/")).toBe("/foo-abc123");
    expect(entityPath("openai", "/")).toBe("/entities/openai");
    expect(eventsIndexHref({ source: "rising" }, "/")).toBe("/?source=rising");
    expect(eventsIndexHref({ topic: "ai" }, "/")).toBe("/ai");
  });

  it("旧前缀剥成规范地址", () => {
    expect(stripEventsMountedPrefix("/events")).toBe("/");
    expect(stripEventsMountedPrefix("/events/foo")).toBe("/foo");
    expect(stripEventsMountedPrefix("/events/entities/x")).toBe("/entities/x");
    expect(stripEventsMountedPrefix("/foo")).toBeNull();
  });

  it("根上认 /:topic、/:slug 与 /entities/:slug，不认保留段和更深路径", () => {
    expect(parseEventsPublicPath("/ai", "/")).toEqual({
      type: "topic",
      topic: "ai",
    });
    expect(parseEventsPublicPath("/foo-abc123", "/")).toEqual({
      type: "event",
      slug: "foo-abc123",
    });
    expect(parseEventsPublicPath("/entities/openai", "/")).toEqual({
      type: "entity",
      slug: "openai",
    });
    expect(parseEventsPublicPath("/", "/")).toEqual({ type: "index" });
    expect(isEventsRootFallbackPath("/")).toBe(false);
    expect(isEventsRootFallbackPath("/ai")).toBe(true);
    expect(isEventsRootFallbackPath("/foo")).toBe(true);
    expect(isEventsRootFallbackPath("/entities")).toBe(true);
    expect(isEventsRootFallbackPath("/feed.xml")).toBe(true);
    expect(isEventsRootFallbackPath("/ai/feed.xml")).toBe(true);
    expect(isEventsRootFallbackPath("/entities/openai/feed.xml")).toBe(true);
    expect(isEventsRootFallbackPath("/foo-abc123/og.png")).toBe(true);
    expect(isEventsRootFallbackPath("/app")).toBe(false);
    expect(isEventsRootFallbackPath("/foo/bar")).toBe(false);
    expect(isEventsRootFallbackPath("/foo-abc123/feed.xml")).toBe(false);
  });

  it("实体枢纽在单段解析之前认，挂在根上时不会被当成事件 slug", () => {
    expect(entityIndexPath()).toBe("/events/entities");
    expect(entityIndexPath("/")).toBe("/entities");
    expect(parseEventsPublicPath("/events/entities")).toEqual({
      type: "entity_index",
    });
    expect(parseEventsRequestPath("/events/entities", true)).toEqual({
      type: "entity_index",
    });
    expect(parseEventsRequestPath("/entities", true)).toEqual({
      type: "entity_index",
    });
    // 枢纽没挂在根上时，`/entities` 不归事件模块管
    expect(parseEventsRequestPath("/entities", false)).toBeNull();
    // 单个实体仍然是实体详情，不会被枢纽吃掉
    expect(parseEventsRequestPath("/entities/openai-abc123", true)).toEqual({
      type: "entity",
      slug: "openai-abc123",
    });
  });

  /*
   * feed.xml / og.png 跟着枢纽挂载走。根挂载的站点上页面已经在 `/entities/openai`
   * 了，订阅链接还指着 `/events/entities/openai/feed.xml` 的话，前缀就在唯一
   * 一个还看得见它的地方漏了出来。
   */
  it("feed.xml 与 og.png 跟着挂载走", () => {
    expect(eventsFeedPath()).toBe("/events/feed.xml");
    expect(eventsFeedPath("ai")).toBe("/events/ai/feed.xml");
    expect(entityFeedPath("openai")).toBe("/events/entities/openai/feed.xml");
    expect(eventOgImagePath("foo-abc123")).toBe("/events/foo-abc123/og.png");

    expect(eventsFeedPath(undefined, "/")).toBe("/feed.xml");
    expect(eventsFeedPath("ai", "/")).toBe("/ai/feed.xml");
    expect(entityFeedPath("openai", "/")).toBe("/entities/openai/feed.xml");
    expect(eventOgImagePath("foo-abc123", "/")).toBe("/foo-abc123/og.png");
  });

  it("末段先认，不会被当成事件 slug", () => {
    expect(parseEventsPublicPath("/events/feed.xml")).toEqual({
      type: "feed",
    });
    expect(parseEventsPublicPath("/events/ai/feed.xml")).toEqual({
      type: "feed",
      topic: "ai",
    });
    expect(parseEventsPublicPath("/events/entities/openai/feed.xml")).toEqual({
      type: "entity_feed",
      slug: "openai",
    });
    expect(parseEventsPublicPath("/events/foo-abc123/og.png")).toEqual({
      type: "og_image",
      slug: "foo-abc123",
    });

    expect(parseEventsPublicPath("/feed.xml", "/")).toEqual({ type: "feed" });
    expect(parseEventsPublicPath("/ai/feed.xml", "/")).toEqual({
      type: "feed",
      topic: "ai",
    });
    expect(parseEventsPublicPath("/entities/openai/feed.xml", "/")).toEqual({
      type: "entity_feed",
      slug: "openai",
    });
    expect(parseEventsPublicPath("/foo-abc123/og.png", "/")).toEqual({
      type: "og_image",
      slug: "foo-abc123",
    });
  });

  /* 不存在的东西不要发一份空 feed：一律交回 404。 */
  it("单条事件没有 feed，主题格与实体页没有卡片图", () => {
    expect(parseEventsPublicPath("/events/foo-abc123/feed.xml")).toBeNull();
    expect(parseEventsPublicPath("/events/entities/feed.xml")).toBeNull();
    expect(parseEventsPublicPath("/events/ai/og.png")).toBeNull();
    expect(parseEventsPublicPath("/events/entities/openai/og.png")).toBeNull();
  });

  /* 根挂载时旧的 feed / og 地址与页面同一条 301 规则。 */
  it("旧 feed / og 地址 301 到根上", () => {
    const mount = { homePath: "/", homeLayoutKey: "events.home" };
    expect(eventsCanonicalLocation("/events/feed.xml", mount)).toBe(
      "/feed.xml",
    );
    expect(eventsCanonicalLocation("/events/ai/feed.xml", mount)).toBe(
      "/ai/feed.xml",
    );
    expect(eventsCanonicalLocation("/events/foo-abc123/og.png", mount)).toBe(
      "/foo-abc123/og.png",
    );
  });

  it("请求路径先认旧前缀，首页挂载时才认根路径", () => {
    expect(parseEventsRequestPath("/events/ai", true)).toEqual({
      type: "topic",
      topic: "ai",
    });
    expect(parseEventsRequestPath("/ai", true)).toEqual({
      type: "topic",
      topic: "ai",
    });
    expect(parseEventsRequestPath("/events/foo", true)).toEqual({
      type: "event",
      slug: "foo",
    });
    expect(parseEventsRequestPath("/foo", true)).toEqual({
      type: "event",
      slug: "foo",
    });
    expect(parseEventsRequestPath("/foo", false)).toBeNull();
    expect(parseEventsRequestPath("/ai", false)).toBeNull();
    expect(isEventsPath("/foo")).toBe(false);
    expect(isEventsPath("/ai")).toBe(false);
    expect(isEventsPath("/events/ai")).toBe(true);
    expect(isEventsPath("/events/foo")).toBe(true);
  });
});

describe("eventsCanonicalLocation", () => {
  const atRoot = { homePath: "/", homeLayoutKey: "events.home" };

  it("首页挂载时旧前缀收到根上", () => {
    expect(eventsCanonicalLocation("/events", atRoot)).toBe("/");
    expect(eventsCanonicalLocation("/events/ai", atRoot)).toBe("/ai");
    expect(eventsCanonicalLocation("/events/foo", atRoot)).toBe("/foo");
  });

  it("未挂到根上时旧 ?topic= 收到路径段", () => {
    expect(eventsCanonicalLocation("/events", {}, { topic: "ai" })).toBe(
      "/events/ai",
    );
    expect(
      eventsCanonicalLocation("/events", {}, { source: "rising", topic: "ai" }),
    ).toBe("/events/ai");
    expect(eventsCanonicalLocation("/events", {}, { source: "rising" })).toBeNull();
  });

  it("已经是主题路径时不再为 ?topic= 改写", () => {
    expect(
      eventsCanonicalLocation("/events/ai", {}, { topic: "tech" }),
    ).toBeNull();
    expect(eventsCanonicalLocation("/ai", atRoot, { topic: "tech" })).toBeNull();
  });
});

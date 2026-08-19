import { describe, expect, it } from "vitest";

import {
  EVENTS_INDEX_PATH,
  eventsCanonicalLocation,
  eventsIndexHref,
  eventsIndexPath,
  eventsMountedAtRoot,
  eventPath,
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
    expect(entityPath("openai", "/")).toBe("/entity/openai");
    expect(eventsIndexHref({ source: "rising" }, "/")).toBe("/?source=rising");
    expect(eventsIndexHref({ topic: "ai" }, "/")).toBe("/ai");
  });

  it("旧前缀剥成规范地址", () => {
    expect(stripEventsMountedPrefix("/events")).toBe("/");
    expect(stripEventsMountedPrefix("/events/foo")).toBe("/foo");
    expect(stripEventsMountedPrefix("/events/entity/x")).toBe("/entity/x");
    expect(stripEventsMountedPrefix("/foo")).toBeNull();
  });

  it("根上认 /:topic、/:slug 与 /entity/:slug，不认保留段和更深路径", () => {
    expect(parseEventsPublicPath("/ai", "/")).toEqual({
      type: "topic",
      topic: "ai",
    });
    expect(parseEventsPublicPath("/foo-abc123", "/")).toEqual({
      type: "event",
      slug: "foo-abc123",
    });
    expect(parseEventsPublicPath("/entity/openai", "/")).toEqual({
      type: "entity",
      slug: "openai",
    });
    expect(parseEventsPublicPath("/", "/")).toEqual({ type: "index" });
    expect(isEventsRootFallbackPath("/")).toBe(false);
    expect(isEventsRootFallbackPath("/ai")).toBe(true);
    expect(isEventsRootFallbackPath("/foo")).toBe(true);
    expect(isEventsRootFallbackPath("/app")).toBe(false);
    expect(isEventsRootFallbackPath("/foo/bar")).toBe(false);
  });

  it("实体枢纽在单段解析之前认，挂在根上时不会被当成事件 slug", () => {
    expect(entityIndexPath()).toBe("/events/entity");
    expect(entityIndexPath("/")).toBe("/entity");
    expect(parseEventsPublicPath("/events/entity")).toEqual({
      type: "entity_index",
    });
    expect(parseEventsRequestPath("/events/entity", true)).toEqual({
      type: "entity_index",
    });
    expect(parseEventsRequestPath("/entity", true)).toEqual({
      type: "entity_index",
    });
    // 枢纽没挂在根上时，`/entity` 不归事件模块管
    expect(parseEventsRequestPath("/entity", false)).toBeNull();
    // 单个实体仍然是实体详情，不会被枢纽吃掉
    expect(parseEventsRequestPath("/entity/openai-abc123", true)).toEqual({
      type: "entity",
      slug: "openai-abc123",
    });
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

import { describe, expect, it } from "vitest";

import {
  EVENTS_INDEX_PATH,
  eventsIndexHref,
  eventsIndexPath,
  eventsMountedAtRoot,
  eventPath,
  entityPath,
  isEventsIndexListing,
  isEventsPath,
  isEventsRootFallbackPath,
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

  it("主题是可选过滤", () => {
    expect(eventsIndexHref({ source: "rising", topic: "ai" })).toBe(
      "/events?source=rising&topic=ai",
    );
    expect(eventsIndexHref({ topic: "tech" })).toBe("/events?topic=tech");
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
  it("只认枢纽路径", () => {
    expect(eventsMountedAtRoot("/events")).toBe(true);
    expect(eventsMountedAtRoot("/events/")).toBe(true);
    expect(eventsMountedAtRoot("/")).toBe(false);
    expect(eventsMountedAtRoot("/shop")).toBe(false);
    expect(eventsMountedAtRoot(undefined)).toBe(false);
  });
});

describe("public paths at root", () => {
  it("枢纽、详情、实体都去掉 /events", () => {
    expect(eventsIndexPath("/events")).toBe("/");
    expect(eventPath("foo-abc123", "/")).toBe("/foo-abc123");
    expect(entityPath("openai", "/")).toBe("/entity/openai");
    expect(eventsIndexHref({ source: "rising" }, "/")).toBe("/?source=rising");
    expect(eventsIndexHref({ topic: "ai" }, "/")).toBe("/?topic=ai");
  });

  it("旧前缀剥成规范地址", () => {
    expect(stripEventsMountedPrefix("/events")).toBe("/");
    expect(stripEventsMountedPrefix("/events/foo")).toBe("/foo");
    expect(stripEventsMountedPrefix("/events/entity/x")).toBe("/entity/x");
    expect(stripEventsMountedPrefix("/foo")).toBeNull();
  });

  it("根上认 /:slug 与 /entity/:slug，不认保留段和更深路径", () => {
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
    expect(isEventsRootFallbackPath("/foo")).toBe(true);
    expect(isEventsRootFallbackPath("/app")).toBe(false);
    expect(isEventsRootFallbackPath("/foo/bar")).toBe(false);
  });

  it("请求路径先认旧前缀，首页挂载时才认根路径", () => {
    expect(parseEventsRequestPath("/events/foo", true)).toEqual({
      type: "event",
      slug: "foo",
    });
    expect(parseEventsRequestPath("/foo", true)).toEqual({
      type: "event",
      slug: "foo",
    });
    expect(parseEventsRequestPath("/foo", false)).toBeNull();
    expect(isEventsPath("/foo")).toBe(false);
    expect(isEventsPath("/events/foo")).toBe(true);
  });
});

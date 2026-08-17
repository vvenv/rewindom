import { describe, expect, it } from "vitest";

import {
  EVENTS_INDEX_PATH,
  eventsIndexHref,
  isEventsIndexListing,
  parseEventsIndexQuery,
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

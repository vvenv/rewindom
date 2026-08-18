import { describe, expect, it } from "vitest";

import {
  buildEventFeedPayload,
  groupFeedsByTopic,
  validateEventFeedForm,
  type EventFeedFormValues,
} from "./event-feeds.js";
import { EVENT_TOPICS } from "../../shared/index.js";

const t = (key: string) => key;

function form(overrides: Partial<EventFeedFormValues> = {}): EventFeedFormValues {
  return {
    connector: "rss",
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    source_kind: "news",
    topic: "tech",
    ...overrides,
  };
}

describe("validateEventFeedForm", () => {
  it("rss 缺地址时报错", () => {
    expect(validateEventFeedForm(form({ url: "" }), t)).toBe(
      "sources.validation.urlRequired",
    );
  });

  it("hackernews 不要求地址", () => {
    expect(
      validateEventFeedForm(
        form({ connector: "hackernews", url: "", source_kind: "community" }),
        t,
      ),
    ).toBeNull();
  });
});

describe("groupFeedsByTopic", () => {
  it("七格都在，没有源的格子是空数组", () => {
    const groups = groupFeedsByTopic([
      {
        id: "1",
        connector: "rss",
        name: "TechCrunch",
        url: "https://techcrunch.com/feed/",
        source_kind: "news",
        topic: "tech",
        enabled: true,
        last_fetched_at: null,
        last_error: null,
      },
    ]);
    expect(groups.map((group) => group.topic)).toEqual([...EVENT_TOPICS]);
    expect(groups.find((group) => group.topic === "tech")?.feeds).toHaveLength(1);
    expect(groups.find((group) => group.topic === "sports")?.feeds).toEqual([]);
  });
});

describe("buildEventFeedPayload", () => {
  it("hackernews 不带 url，交给服务端填内置端点", () => {
    expect(
      buildEventFeedPayload(
        form({ connector: "hackernews", url: "https://ignored.example" }),
      ),
    ).toEqual({
      connector: "hackernews",
      name: "TechCrunch",
      url: undefined,
      source_kind: "news",
      topic: "tech",
    });
  });
});

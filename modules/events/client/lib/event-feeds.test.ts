import { describe, expect, it } from "vitest";

import {
  buildEventFeedPayload,
  validateEventFeedForm,
  type EventFeedFormValues,
} from "./event-feeds.js";

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

import { describe, expect, it } from "vitest";

import {
  buildEventFeedPayload,
  groupFeedsByTopic,
  validateEventFeedForm,
  type EventFeedFormValues,
} from "./event-feeds.js";
import { EVENT_TOPICS } from "../../shared/index.js";

const t = (key: string) => key;

function form(
  overrides: Partial<EventFeedFormValues> = {},
): EventFeedFormValues {
  return {
    connector: "rss",
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    source_kind: "news",
    topic: "tech",
    publisher_entity_name: "",
    publisher_entity_kind: "org",
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
    expect(groups.find((group) => group.topic === "tech")?.feeds).toHaveLength(
      1,
    );
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
      publisher_entity_name: "",
      publisher_entity_kind: "org",
    });
  });

  /*
   * 一篇 TechCrunch 报道不是「关于 TechCrunch」的。界面上切到 news 时那两个框
   * 就消失了，但表单里可能还留着切换之前填的值——不能把它发出去。
   */
  it("非一手来源不带出版方，哪怕表单里还留着切换前填的值", () => {
    expect(
      buildEventFeedPayload(
        form({ source_kind: "news", publisher_entity_name: "TechCrunch" }),
      ).publisher_entity_name,
    ).toBe("");
  });

  it("一手来源带上出版方", () => {
    expect(
      buildEventFeedPayload(
        form({
          source_kind: "status",
          publisher_entity_name: "  Cloudflare  ",
          publisher_entity_kind: "company",
        }),
      ),
    ).toMatchObject({
      publisher_entity_name: "Cloudflare",
      publisher_entity_kind: "company",
    });
  });
});

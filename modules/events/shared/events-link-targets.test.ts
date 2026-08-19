import { describe, expect, it } from "vitest";

import { eventsLinkTargets } from "./events-link-targets.js";

const labels = {
  indexLabel: "事件枢纽",
  entityIndexLabel: "实体枢纽",
  currentTopicFeedLabel: "当前主题 RSS",
  siteFeedLabel: "全站 RSS",
  topicFeedLabel: (name: string) => `${name} RSS`,
  topicName: (topic: string) => topic.toUpperCase(),
};

describe("eventsLinkTargets", () => {
  it("puts hubs in the page group and RSS in the feed group", () => {
    const targets = eventsLinkTargets({ ...labels, topics: ["ai", "tech"] });
    expect(targets.filter((item) => item.group === "page").map((item) => item.value)).toEqual([
      "/events",
      "/events/entities",
    ]);
    expect(targets.filter((item) => item.group === "feed").map((item) => item.value)).toEqual([
      "/events/{topic_slug}/feed.xml",
      "/events/feed.xml",
      "/events/ai/feed.xml",
      "/events/tech/feed.xml",
    ]);
  });

  it("stores the current-topic feed as an interpolatable href, not a runtime sentinel", () => {
    const values = eventsLinkTargets({ ...labels, topics: ["ai"] }).map((item) => item.value);
    expect(values[2]).toBe("/events/{topic_slug}/feed.xml");
    expect(values.every((value) => value.startsWith("/events"))).toBe(true);
  });

  it("labels a topic feed with the localized topic name", () => {
    const ai = eventsLinkTargets({
      ...labels,
      topics: ["ai"],
      topicName: () => "人工智能",
      topicFeedLabel: (name) => `订阅 ${name}`,
    }).find((item) => item.value === "/events/ai/feed.xml");
    expect(ai?.label).toBe("订阅 人工智能");
  });
});

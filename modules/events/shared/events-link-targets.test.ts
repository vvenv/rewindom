import { describe, expect, it } from "vitest";

import { eventsLinkTargets } from "./events-link-targets.js";

const labels = {
  entityIndexLabel: "实体枢纽",
  currentTopicFeedLabel: "当前主题 RSS",
  siteFeedLabel: "全站 RSS",
  topicFeedLabel: (name: string) => `${name} RSS`,
  topicName: (topic: string) => topic.toUpperCase(),
};

describe("eventsLinkTargets", () => {
  it("puts the entity hub in the page group and RSS in the feed group", () => {
    const targets = eventsLinkTargets({ ...labels, topics: ["ai", "tech"] });
    expect(targets.filter((item) => item.group === "page").map((item) => item.value)).toEqual([
      "/entities",
    ]);
    expect(targets.filter((item) => item.group === "feed").map((item) => item.value)).toEqual([
      "{feed}",
      "/feed.xml",
      "/topics/ai/feed.xml",
      "/topics/tech/feed.xml",
    ]);
  });

  it("labels a topic feed with the localized topic name", () => {
    const ai = eventsLinkTargets({
      ...labels,
      topics: ["ai"],
      topicName: () => "人工智能",
      topicFeedLabel: (name) => `订阅 ${name}`,
    }).find((item) => item.value === "/topics/ai/feed.xml");
    expect(ai?.label).toBe("订阅 人工智能");
  });
});

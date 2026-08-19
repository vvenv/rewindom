import { describe, expect, it } from "vitest";

import { eventsLinkTargets } from "./events-link-targets.js";

const labels = {
  indexLabel: "事件枢纽",
  entityIndexLabel: "实体枢纽",
  siteFeedLabel: "全站 RSS",
  topicFeedLabel: (name: string) => `${name} RSS`,
  topicName: (topic: string) => topic.toUpperCase(),
};

describe("eventsLinkTargets", () => {
  it("puts hubs in the page group and RSS in the feed group", () => {
    const targets = eventsLinkTargets({ ...labels, topics: ["ai", "tech"] });
    expect(targets.filter((item) => item.group === "page").map((item) => item.value)).toEqual([
      "/events",
      "/events/entity",
    ]);
    expect(targets.filter((item) => item.group === "feed").map((item) => item.value)).toEqual([
      "/events/feed.xml",
      "/events/feed.xml?topic=ai",
      "/events/feed.xml?topic=tech",
    ]);
  });

  it("does not invent a current-page sentinel — stored hrefs are stable", () => {
    const values = eventsLinkTargets({ ...labels, topics: ["ai"] }).map((item) => item.value);
    expect(values.every((value) => value.startsWith("/events"))).toBe(true);
    expect(values.some((value) => value.includes("current") || value.includes("this"))).toBe(
      false,
    );
  });

  it("labels a topic feed with the localized topic name", () => {
    const ai = eventsLinkTargets({
      ...labels,
      topics: ["ai"],
      topicName: () => "人工智能",
      topicFeedLabel: (name) => `订阅 ${name}`,
    }).find((item) => item.value.includes("topic=ai"));
    expect(ai?.label).toBe("订阅 人工智能");
  });
});

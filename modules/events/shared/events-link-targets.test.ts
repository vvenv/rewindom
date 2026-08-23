import { describe, expect, it } from "vitest";

import { eventsLinkTargets } from "./events-link-targets.js";

const labels = {
  entityIndexLabel: "实体枢纽",
  currentTopicSubscribeLabel: "邮件订阅：当前主题",
  currentEntitySubscribeLabel: "邮件订阅：当前实体",
  currentTopicFeedLabel: "当前主题 RSS",
  siteFeedLabel: "全站 RSS",
  topicFeedLabel: (name: string) => `${name} RSS`,
  topicName: (topic: string) => topic.toUpperCase(),
};

describe("eventsLinkTargets", () => {
  it("puts the entity hub in the page group and RSS in the feed group", () => {
    const targets = eventsLinkTargets({ ...labels, topics: ["ai", "tech"] });
    expect(
      targets.filter((item) => item.group === "page").map((item) => item.value),
    ).toEqual([
      "/entities",
      // 邮件订阅：跳订阅页并带上当前页的范围
      "/subscribe?list={topic_list}",
      "/subscribe?list={entity_list}",
    ]);
    expect(
      targets.filter((item) => item.group === "feed").map((item) => item.value),
    ).toEqual([
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

describe("邮件订阅候选", () => {
  it("值里是整串 list token，不是拼出来的 events:topic:{topic_slug}", () => {
    /*
     * `collapseQuery` 只在**整个查询值为空**时才丢掉那个参数。拼起来的话，
     * 没有主题的页面上会剩下 `list=events:topic:` —— 一个残缺却「非空」的 key，
     * 读者会订上一个永远不会有内容的列表。
     */
    const targets = eventsLinkTargets({ ...labels, topics: ["ai"] });
    const subscribe = targets.filter((item) =>
      item.value.startsWith("/subscribe"),
    );
    expect(subscribe.map((item) => item.value)).toEqual([
      "/subscribe?list={topic_list}",
      "/subscribe?list={entity_list}",
    ]);
    for (const item of subscribe) {
      expect(item.value).not.toContain("events:topic:");
      expect(item.value).not.toContain("events:entity:");
    }
  });

  it("不给七个主题各来一条——「当前主题」摆在模板页上就覆盖全部", () => {
    const targets = eventsLinkTargets({
      ...labels,
      topics: ["ai", "tech", "business"],
    });
    expect(
      targets.filter((item) => item.value.startsWith("/subscribe")),
    ).toHaveLength(2);
  });
});

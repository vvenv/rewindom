import { describe, expect, it } from "vitest";

import { classifyEventTopic, type TopicClassifierSignal } from "./topic-classifier.js";

function signal(
  title: string,
  overrides: Partial<TopicClassifierSignal> = {},
): TopicClassifierSignal {
  return {
    title,
    excerpt: "",
    source_kind: "community",
    topic_hint: "tech",
    ...overrides,
  };
}

describe("classifyEventTopic", () => {
  /*
   * 能力边界，别当成 bug 修：EVENT_TOPICS 里没有「历史 / 科普」这一格，
   * 中世纪投石机这条（线上真实语料，被标成「科技」）在当前分类法下**没有正确答案**。
   * 一个关键词都不命中时回落到源提示 = tech，这是诚实的结果。
   * 要修它得先加主题枚举，那是产品决策，不是分类器的锅。
   */
  it("分类法里没有对应主题时，回落到源提示而不是硬凑一个", () => {
    expect(
      classifyEventTopic([
        signal("Meet the only known trebuchet casualty in history", {
          excerpt: "A medieval siege engine killed its own operator.",
        }),
      ]),
    ).toBe("tech");
  });

  it("公共卫生政策归 world，不归 tech", () => {
    expect(
      classifyEventTopic([
        signal("Universal Health Coverage Could Save $1T and 114,000 Lives a Year", {
          excerpt:
            "A United Nations report on the pandemic response and climate-driven outbreak risk.",
        }),
      ]),
    ).toBe("world");
  });

  it("真正的技术事件仍然是 tech", () => {
    expect(
      classifyEventTopic([
        signal("Incident with GitHub.com", {
          excerpt: "GitHub is experiencing an outage affecting the API and PR access.",
        }),
        signal("GitHub down again? no PR access"),
      ]),
    ).toBe("tech");
  });

  it("跨源同一件事：官方源的提示压过社区源的提示", () => {
    const topic = classifyEventTopic([
      signal("Introducing our newest model", {
        source_kind: "official",
        topic_hint: "ai",
      }),
      signal("Discussion thread", { source_kind: "community", topic_hint: "tech" }),
    ]);
    expect(topic).toBe("ai");
  });

  it("并购新闻按内容归 business，即便源提示是 ai", () => {
    expect(
      classifyEventTopic([
        signal("Stripe Clinches $7B Deal to Buy OpenRouter", {
          excerpt:
            "The acquisition values the startup at a $7 billion valuation after its Series C.",
          source_kind: "news",
          topic_hint: "ai",
        }),
      ]),
    ).toBe("business");
  });

  it("标题命中压过摘录命中", () => {
    expect(
      classifyEventTopic([
        signal("World Cup final draws record audience", {
          excerpt: "The broadcast used a new streaming framework and API.",
          topic_hint: "tech",
        }),
      ]),
    ).toBe("sports");
  });

  /*
   * 短词是这张表里最容易误伤的部分。子串匹配会让 `ai` 命中 `said`、
   * `rag` 命中 `fragment`，主题分布会整体塌向 ai。
   */
  it("短关键词按词边界匹配，不吃子串", () => {
    expect(
      classifyEventTopic([
        signal("He said the fragment was retained", { topic_hint: "world" }),
      ]),
    ).toBe("world");
  });

  it("一个关键词都没命中时回落到加权最高的源提示", () => {
    expect(
      classifyEventTopic([
        signal("Untitled", { source_kind: "official", topic_hint: "gaming" }),
      ]),
    ).toBe("gaming");
  });

  it("没有信号时给一个确定值，不抛错", () => {
    expect(classifyEventTopic([])).toBe("tech");
  });
});

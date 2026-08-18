import { describe, expect, it } from "vitest";

import { escapeXml, renderRssXml, toRfc822 } from "./rss-xml.js";

const CHANNEL = {
  title: "Yestino Events",
  link: "https://yestino.com/events",
  description: "跨来源发现事件",
  self_url: "https://yestino.com/events/feed.xml",
  language: "zh-CN",
  items: [
    {
      title: "OpenAI releases GPT-6",
      link: "https://yestino.com/events/openai-gpt6-abc123",
      description: "OpenAI released GPT-6 today.",
      published_at: "2026-08-18T10:17:00.000Z",
    },
  ],
};

describe("renderRssXml", () => {
  it("是合法的 RSS 2.0 骨架", () => {
    const xml = renderRssXml(CHANNEL);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain("<channel>");
    expect(xml).toContain("</rss>");
  });

  /* rel="self" 是校验器要求的一项，也让阅读器知道 feed 的规范地址。 */
  it("带 atom:link rel=self", () => {
    expect(renderRssXml(CHANNEL)).toContain(
      '<atom:link href="https://yestino.com/events/feed.xml" rel="self" type="application/rss+xml"/>',
    );
  });

  /*
   * guid 用详情页地址：事件 slug 一旦生成就不变（slugify + id 后缀），
   * 是稳定的订阅身份，阅读器据此判断「这条读过没有」。
   */
  it("guid 是详情页永久地址", () => {
    expect(renderRssXml(CHANNEL)).toContain(
      '<guid isPermaLink="true">https://yestino.com/events/openai-gpt6-abc123</guid>',
    );
  });

  it("pubDate 是 RFC 822", () => {
    expect(renderRssXml(CHANNEL)).toContain(
      "<pubDate>Tue, 18 Aug 2026 10:17:00 GMT</pubDate>",
    );
  });

  it("没有条目时仍然是合法 feed，不报错", () => {
    const xml = renderRssXml({ ...CHANNEL, items: [] });
    expect(xml).toContain("<channel>");
    expect(xml).not.toContain("<item>");
  });

  it("空描述不产出空标签", () => {
    const xml = renderRssXml({
      ...CHANNEL,
      items: [{ ...CHANNEL.items[0], description: "" }],
    });
    expect(xml).not.toContain("<description></description>");
  });

  it("标题里的尖括号与 & 被转义，不会破坏文档结构", () => {
    const xml = renderRssXml({
      ...CHANNEL,
      items: [{ ...CHANNEL.items[0], title: 'A & B <script>x</script> "q"' }],
    });
    expect(xml).toContain("A &amp; B &lt;script&gt;");
    expect(xml).not.toContain("<script>");
  });
});

describe("escapeXml", () => {
  it("转义五个 XML 元字符", () => {
    expect(escapeXml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&apos;");
  });

  /*
   * 事件标题来自外部来源（RSS、HN），什么都可能有。一个 0x08 就能让整个 feed
   * 在阅读器里解析失败，而且是**静默失败**——这正是不复用 escapeHtml 的原因。
   */
  it("剔除 XML 1.0 不允许的控制字符", () => {
    // 这些字符会让整个 feed 在阅读器里静默解析失败
    expect(escapeXml("a\u0008b\u001Fc\u007Fd")).toBe("abcd");
  });

  it("保留合法的空白字符", () => {
    expect(escapeXml("a\tb\nc\rd")).toBe("a\tb\nc\rd");
  });

  it("保留中文与 emoji", () => {
    expect(escapeXml("事件 🚀")).toBe("事件 🚀");
  });
});

describe("toRfc822", () => {
  it("转成 RFC 822", () => {
    expect(toRfc822("2026-08-18T10:17:00.000Z")).toBe(
      "Tue, 18 Aug 2026 10:17:00 GMT",
    );
  });

  /* 取不到合法时间就留空，不编一个——与「时间戳不由模型给」同一条口径。 */
  it("非法时间返回空串，不编一个", () => {
    expect(toRfc822("不是时间")).toBe("");
  });
});

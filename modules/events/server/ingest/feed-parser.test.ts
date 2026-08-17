import { describe, expect, it } from "vitest";

import { parseFeed, stripHtml } from "./feed-parser.js";

const RSS = `<?xml version="1.0"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Example News</title>
    <link>https://example.com</link>
    <item>
      <title><![CDATA[OpenAI ships a new model]]></title>
      <link>https://example.com/a?utm_source=rss</link>
      <guid isPermaLink="false">post-1</guid>
      <pubDate>Tue, 12 Aug 2025 10:02:00 GMT</pubDate>
      <description>&lt;p&gt;The model is &amp;quot;fast&amp;quot;.&lt;/p&gt;</description>
      <dc:creator>Jane</dc:creator>
    </item>
    <item>
      <title>Second story</title>
      <link>https://example.com/b</link>
      <pubDate>not a date</pubDate>
    </item>
    <item>
      <description>no title, no link — must be skipped</description>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example Blog</title>
  <link rel="self" href="https://example.com/feed.xml"/>
  <entry>
    <title>Announcing something</title>
    <link rel="self" href="https://example.com/feed.xml"/>
    <link rel="alternate" href="https://example.com/announcing?ref=feed"/>
    <id>tag:example.com,2025:post/9</id>
    <published>2025-08-12T10:02:00Z</published>
    <updated>2025-08-12T11:00:00Z</updated>
    <summary type="html">&lt;p&gt;Details &amp;amp; notes&lt;/p&gt;</summary>
    <author><name>Ada</name></author>
  </entry>
</feed>`;

describe("parseFeed —— RSS", () => {
  const items = parseFeed(RSS);

  it("解析出可用的条目，跳过缺 title/link 的畸形条目", () => {
    expect(items).toHaveLength(2);
  });

  it("剥掉 CDATA 与 HTML 实体", () => {
    expect(items[0].title).toBe("OpenAI ships a new model");
    expect(items[0].summary).toBe('The model is "fast".');
  });

  it("guid 优先作为 external_id", () => {
    expect(items[0].id).toBe("post-1");
  });

  it("缺 guid 时回落到 link", () => {
    expect(items[1].id).toBe("https://example.com/b");
  });

  it("解析 RFC 822 日期；无法解析时返回 null 交给调用方兜底", () => {
    expect(items[0].published_at?.toISOString()).toBe("2025-08-12T10:02:00.000Z");
    expect(items[1].published_at).toBeNull();
  });

  it("读取 dc:creator 作为作者", () => {
    expect(items[0].author).toBe("Jane");
  });
});

describe("parseFeed —— Atom", () => {
  const items = parseFeed(ATOM);

  it("取 rel=alternate 的 link，而不是 rel=self 的订阅地址", () => {
    expect(items[0].link).toBe("https://example.com/announcing?ref=feed");
  });

  it("id 用 Atom 的 <id>", () => {
    expect(items[0].id).toBe("tag:example.com,2025:post/9");
  });

  it("published 优先于 updated", () => {
    expect(items[0].published_at?.toISOString()).toBe("2025-08-12T10:02:00.000Z");
  });

  it("author 取嵌套的 <name>", () => {
    expect(items[0].author).toBe("Ada");
  });

  it("summary 去标签后保留文本", () => {
    expect(items[0].summary).toBe("Details & notes");
  });
});

describe("stripHtml", () => {
  it("去标签并折叠空白", () => {
    expect(stripHtml("<p>a</p>\n  <p>b</p>")).toBe("a b");
  });

  it("解析数字实体", () => {
    expect(stripHtml("&#65;&#x42;")).toBe("AB");
  });
});

import { describe, expect, it } from "vitest";

import { toSignal } from "./rss.connector.js";

import type { ConnectorFeed } from "./connector.js";
import type { ParsedFeedItem } from "./feed-parser.js";

function item(overrides: Partial<ParsedFeedItem> = {}): ParsedFeedItem {
  return {
    id: "guid-1",
    title: "Elevated error rates in WAF",
    link: "https://blog.cloudflare.com/waf-incident/",
    summary: "A short teaser.",
    content: "",
    author: null,
    published_at: new Date("2026-08-20T11:24:00Z"),
    ...overrides,
  };
}

function feed(overrides: Partial<ConnectorFeed> = {}): ConnectorFeed {
  return {
    id: "feed-1",
    connector: "rss",
    name: "Cloudflare Blog",
    url: "https://blog.cloudflare.com/rss/",
    source_kind: "official",
    topic: "tech",
    ...overrides,
  };
}

/**
 * 摘录取 teaser 还是正文——这是「一条单信号事件有没有内容」的分水岭：
 * 全库 98% 的事件终生只有一条信号，摘要就是这段摘录。
 */
describe("toSignal —— 摘录取自 teaser 还是正文", () => {
  it("一手来源：正文显著更长时用正文", () => {
    const body = "On 2026-08-20 we deployed a WAF rule. ".repeat(6);
    const signal = toSignal(item({ content: body }), feed());
    expect(signal.excerpt).toContain("we deployed a WAF rule");
  });

  it("一手来源：正文与 teaser 长度接近时保持 teaser", () => {
    const signal = toSignal(
      item({ content: "A short teaser, slightly longer." }),
      feed(),
    );
    expect(signal.excerpt).toBe("A short teaser.");
  });

  it("teaser 为空且正文够长时用正文", () => {
    const body = "The board approved the acquisition on Tuesday. ".repeat(4);
    const signal = toSignal(item({ summary: "", content: body }), feed());
    expect(signal.excerpt).toContain("The board approved");
  });

  it("news 源一律保持 teaser —— 整篇文章截 600 字不如它自己写的导语", () => {
    const body = "Paragraph one. Related reading: ten other stories. ".repeat(
      8,
    );
    const signal = toSignal(
      item({ content: body }),
      feed({ source_kind: "news", name: "TechCrunch" }),
    );
    expect(signal.excerpt).toBe("A short teaser.");
  });

  it("状态页解析出一手更新序列时用原 description —— 嵌套那几格与摘录必须同源", () => {
    const description =
      "Aug 20, 11:42 UTC Resolved - This incident has been resolved. " +
      "Aug 20, 10:58 UTC Investigating - We are investigating reports of errors.";
    const signal = toSignal(
      item({
        summary: description,
        content: "A totally different body. ".repeat(20),
      }),
      feed({ source_kind: "status", name: "Cloudflare Status" }),
    );
    expect(signal.incident_updates?.length).toBeGreaterThan(0);
    expect(signal.excerpt).toContain("We are investigating reports");
  });
});

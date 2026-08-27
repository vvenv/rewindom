import { describe, expect, it } from "vitest";

import {
  CARD_SOURCE_LIMIT,
  sourceIconImgHtml,
  sourcesLineHtml,
} from "./source-icon-html.js";

describe("sourceIconImgHtml", () => {
  it("没有地址时画首字母占位", () => {
    const html = sourceIconImgHtml(null, "Variety");
    expect(html).toContain('class="events-source-icon-slot"');
    expect(html).toContain(
      '<span class="events-source-icon-fallback">V</span>',
    );
    expect(html).not.toContain("<img");
  });

  it("有地址时 img 叠在首字母上，坏掉就摘掉 img", () => {
    const html = sourceIconImgHtml("/events/icons/openai.com", "OpenAI");
    expect(html).toContain('src="/events/icons/openai.com"');
    expect(html).toContain('onerror="this.remove()"');
    expect(html).toContain("events-source-icon-fallback");
    expect(html).not.toContain("google.com/s2");
  });

  it("名字里的尖括号不落进 markup", () => {
    expect(sourceIconImgHtml(null, "<script>")).toContain(">&lt;</span>");
  });
});

describe("sourcesLineHtml", () => {
  it("每个源名都带 icon 槽，缺 URL 也占位", () => {
    const html = sourcesLineHtml(
      ["OpenAI", "Ghost"],
      ["/events/icons/openai.com"],
    );
    expect(html).toContain(">OpenAI</span>");
    expect(html).toContain(">Ghost</span>");
    expect(html.match(/events-source-icon-slot/g)?.length).toBe(2);
    expect(html).toContain('src="/events/icons/openai.com"');
  });

  it("不传 limit 就列全——详情页与来源列表是清单，不封顶", () => {
    const names = ["A", "B", "C", "D", "E"];
    const html = sourcesLineHtml(names);
    expect(html.match(/events-source-icon-slot/g)?.length).toBe(5);
    expect(html).not.toContain("events-source-more");
  });

  it("传了 limit 就截断，剩下的收成一个 +N", () => {
    const names = ["Variety", "Deadline", "TheWrap", "Billboard", "Pitchfork"];
    const html = sourcesLineHtml(names, [], CARD_SOURCE_LIMIT);
    expect(html.match(/events-source-icon-slot/g)?.length).toBe(3);
    expect(html).toContain("Variety");
    expect(html).toContain("TheWrap");
    // 第四家起收进 +N —— 封顶 3 家与工作台 EventCard 同口径（见 card-source-line.spec.yaml §3）
    expect(html).not.toContain("Billboard");
    expect(html).toContain('<span class="events-source-more">+2</span>');
  });

  it("正好等于 limit 时不画 +0", () => {
    const html = sourcesLineHtml(["A", "B", "C"], [], CARD_SOURCE_LIMIT);
    expect(html).not.toContain("events-source-more");
  });
});

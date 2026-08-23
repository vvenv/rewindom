import { describe, expect, it } from "vitest";

import { sourceIconImgHtml, sourcesLineHtml } from "./source-icon-html.js";

describe("sourceIconImgHtml", () => {
  it("没有地址也画 fallback 占位", () => {
    const html = sourceIconImgHtml(null);
    expect(html).toContain('class="events-source-icon-slot"');
    expect(html).toContain("events-source-icon-fallback");
    expect(html).not.toContain("<img");
  });

  it("有地址时 img 叠在 fallback 上，坏掉就摘掉 img", () => {
    const html = sourceIconImgHtml("/events/icons/openai.com");
    expect(html).toContain('src="/events/icons/openai.com"');
    expect(html).toContain("onerror=\"this.remove()\"");
    expect(html).toContain("events-source-icon-fallback");
    expect(html).not.toContain("google.com/s2");
  });
});

describe("sourcesLineHtml", () => {
  it("每个源名都带 icon 槽，缺 URL 也占位", () => {
    const html = sourcesLineHtml(["OpenAI", "Ghost"], ["/events/icons/openai.com"]);
    expect(html).toContain(">OpenAI</span>");
    expect(html).toContain(">Ghost</span>");
    expect(html.match(/events-source-icon-slot/g)?.length).toBe(2);
    expect(html).toContain('src="/events/icons/openai.com"');
  });
});

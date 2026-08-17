import { describe, expect, it } from "vitest";

import {
  excerptFromHtml,
  isFetchableArticleUrl,
  isUsableExcerpt,
  looksLikeBotWall,
  truncateExcerpt,
} from "./page-excerpt.js";

describe("excerptFromHtml", () => {
  it("优先 og:description", () => {
    expect(
      excerptFromHtml(`
        <meta name="description" content="Generic site blurb that is long enough.">
        <meta property="og:description" content="OpenAI shipped GPT-6 with realtime video today.">
      `),
    ).toBe("OpenAI shipped GPT-6 with realtime video today.");
  });

  it("content 写在 property 前面也能读到", () => {
    expect(
      excerptFromHtml(
        `<meta content="A longer lede about the product launch today." property="og:description">`,
      ),
    ).toBe("A longer lede about the product launch today.");
  });

  it("没有 og 时用 twitter / name=description", () => {
    expect(
      excerptFromHtml(
        `<meta name="twitter:description" content="Community discussion centred on latency and cost.">`,
      ),
    ).toBe("Community discussion centred on latency and cost.");
  });

  it("没有 meta 时取第一段像样的 p", () => {
    expect(
      excerptFromHtml(`
        <p>Nav</p>
        <p>The company said the model can generate realtime video from a text prompt.</p>
      `),
    ).toBe("The company said the model can generate realtime video from a text prompt.");
  });

  it("太短的口号不当摘录", () => {
    expect(excerptFromHtml(`<meta property="og:description" content="Home">`)).toBe(
      "",
    );
  });
});

describe("isFetchableArticleUrl", () => {
  it("HN 讨论页不是原文，不去抓", () => {
    expect(
      isFetchableArticleUrl("https://news.ycombinator.com/item?id=42"),
    ).toBe(false);
  });

  it("普通文章链接可以抓", () => {
    expect(isFetchableArticleUrl("https://openai.com/blog/gpt-6")).toBe(true);
  });

  it("PDF / 图片不去抓", () => {
    expect(isFetchableArticleUrl("https://example.com/paper.pdf")).toBe(false);
    expect(isFetchableArticleUrl("https://example.com/shot.png")).toBe(false);
  });
});

describe("isUsableExcerpt", () => {
  it("空串或与标题相同都不可用", () => {
    expect(isUsableExcerpt("   ", "Title")).toBe(false);
    expect(isUsableExcerpt("OpenAI releases GPT-6.", "OpenAI releases GPT-6")).toBe(
      false,
    );
  });

  it("比标题多出来的说明可用", () => {
    expect(
      isUsableExcerpt(
        "OpenAI releases GPT-6. It supports realtime video.",
        "OpenAI releases GPT-6",
      ),
    ).toBe(true);
  });
});

describe("looksLikeBotWall", () => {
  it("挡住 Cloudflare 挑战页", () => {
    expect(looksLikeBotWall("Just a moment... Cloudflare")).toBe(true);
    expect(looksLikeBotWall("The model can generate realtime video.")).toBe(
      false,
    );
  });
});

describe("truncateExcerpt", () => {
  it("过长截断", () => {
    const excerpt = truncateExcerpt("x".repeat(700));
    expect(excerpt.length).toBeLessThanOrEqual(600);
    expect(excerpt.endsWith("…")).toBe(true);
  });
});

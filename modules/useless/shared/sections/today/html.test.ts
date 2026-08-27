import { describe, expect, it } from "vitest";

import { renderUselessTodayHtml } from "./html.js";

import type { SectionRenderContext } from "@rewindom/builtin/marketing/shared/sections/render-context.js";
import type { SiteSection } from "@rewindom/builtin/marketing/shared/section-schema.js";

function section(settings: Record<string, unknown> = {}): SiteSection {
  return {
    id: "sec-1",
    type: "useless.today",
    settings,
    blocks: [],
  } as unknown as SiteSection;
}

const emptyCtx = {} as SectionRenderContext;

const withToday = (text: string | null) =>
  ({
    contributed: {
      useless: { today: text === null ? null : { text } },
    },
  }) as never;

describe("今天那条 SSR", () => {
  it("句子直接进 HTML —— 关掉 JS 也看得见", () => {
    const html = renderUselessTodayHtml(
      section(),
      withToday("宜家的铅笔，你拿回家过。"),
    );
    expect(html).toContain("宜家的铅笔，你拿回家过。");
    expect(html).toContain("useless-today-text");
  });

  it("转义正文，不给注入留口子", () => {
    const html = renderUselessTodayHtml(
      section(),
      withToday("<script>alert(1)</script>"),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("池子空时出空态文案，而不是整段消失", () => {
    // 段是租户主动摆上去的，凭空不见会让人以为坏了
    const html = renderUselessTodayHtml(
      section({ empty_text: "今天没有。" }),
      withToday(null),
    );
    expect(html).toContain("今天没有。");
    expect(html).toContain("useless-today-empty");
  });

  it("上下文缺失走同一条空态分支（预览未登记 provider / provider 抛错）", () => {
    const html = renderUselessTodayHtml(
      section({ empty_text: "今天没有。" }),
      emptyCtx,
    );
    expect(html).toContain("今天没有。");
  });

  it("有句子时不出空态文案", () => {
    const html = renderUselessTodayHtml(
      section({ empty_text: "今天没有。" }),
      withToday("一张纸对折七次以后就折不动了。"),
    );
    expect(html).not.toContain("今天没有。");
  });
});

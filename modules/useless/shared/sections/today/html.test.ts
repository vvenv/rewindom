import { describe, expect, it } from "vitest";

import { renderUselessTodayHtml } from "./html.js";

import type { UselessRenderContext } from "../../useless-section-context.js";
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

function ctxWith(patch: Partial<UselessRenderContext>) {
  const base: UselessRenderContext = {
    date: "2026-08-27",
    is_today: true,
    thing: null,
    prev: null,
    next: null,
    earliest: null,
    latest: null,
    labels: {
      prev: "前一天",
      next: "后一天",
      today: "回到今天",
      pick: "挑一天",
      empty: "今天没有。",
    },
  };
  return { contributed: { useless: { ...base, ...patch } } } as never;
}

const line = (text: string) =>
  ctxWith({ thing: { kind: "text" as const, title: "", text, html: "" } });

const embed = (html: string, title = "按钮") =>
  ctxWith({ thing: { kind: "embed" as const, title, text: "", html } });

describe("那天那个 · 句子", () => {
  it("直接进 HTML —— 关掉 JS 也看得见", () => {
    const html = renderUselessTodayHtml(section(), line("宜家的铅笔，你拿回家过。"));
    expect(html).toContain("宜家的铅笔，你拿回家过。");
    expect(html).toContain("useless-today-text");
  });

  it("转义正文，不给注入留口子", () => {
    const html = renderUselessTodayHtml(section(), line("<script>alert(1)</script>"));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("那天那个 · 可交互", () => {
  it("HTML **原样**进页面 —— 这是这个形态的全部意义", () => {
    // 站长的决定：不套 iframe，代码上站前人工审过
    const html = renderUselessTodayHtml(section(), embed("<button>x</button>"));
    expect(html).toContain("<button>x</button>");
    expect(html).not.toContain("&lt;button&gt;");
  });

  it("不再套 iframe", () => {
    const html = renderUselessTodayHtml(section(), embed("<button>x</button>"));
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("srcdoc");
  });

  it("包在 .useless-thing 容器里，容器 id 跟着段走", () => {
    // 没有 iframe 边界了，容器是内容唯一的作用域锚点；同一页摆两个不能撞
    const html = renderUselessTodayHtml(section(), embed("<button>x</button>"));
    expect(html).toContain('class="useless-thing" id="ut-sec-1"');
  });

  it("舞台带 is-stage，日期行收在舞台里 —— 句子和可交互物都铺满视口", () => {
    const html = renderUselessTodayHtml(section(), embed("<button>x</button>"));
    expect(html).toContain('class="useless-today is-stage"');
    expect(html).toMatch(
      /class="useless-today is-stage"[\s\S]*class="useless-thing"[\s\S]*class="useless-nav"/,
    );

    const lineHtml = renderUselessTodayHtml(
      section(),
      line("宜家的铅笔，你拿回家过。"),
    );
    expect(lineHtml).toContain('class="useless-today is-stage"');
    expect(lineHtml).toMatch(
      /class="useless-today is-stage"[\s\S]*useless-today-text[\s\S]*class="useless-nav"/,
    );
  });

  it("名字不进页面 —— 访客自己去摸，标题会把玩笑先说破", () => {
    const html = renderUselessTodayHtml(
      section(),
      embed("<button>x</button>", "永远差一点的加载"),
    );
    expect(html).not.toContain("永远差一点的加载");
    expect(html).not.toContain("useless-thing-title");
  });
});

describe("那天那个 · 空态与导航", () => {
  it("那天没有东西时出空态文案，而不是整段消失", () => {
    // 段没填 empty_text 时用服务端送来的库存句
    const html = renderUselessTodayHtml(section(), ctxWith({ thing: null }));
    expect(html).toContain("今天没有。");
  });

  it("租户填了 empty_text 就用租户的", () => {
    const html = renderUselessTodayHtml(
      section({ empty_text: "今天真的没有。" }),
      ctxWith({ thing: null }),
    );
    expect(html).toContain("今天真的没有。");
  });

  it("导航文案来自 labels，绝不吐 ns:key 原文给访客", () => {
    // 曾经这几个是段的 setting（default 写 `useless:nav.prev`），而编辑器
    // 「添加区块」不展开 ns:key，访客真的看到了 `useless:nav.prev`
    const html = renderUselessTodayHtml(
      section(),
      ctxWith({ prev: "2026-08-26", is_today: false }),
    );
    expect(html).toContain("前一天");
    expect(html).toContain("回到今天");
    expect(html).not.toMatch(/useless:[a-z]/);
  });

  it("上下文缺失时不画导航——一排点不动的按钮比不画更糟", () => {
    const html = renderUselessTodayHtml(section({ empty_text: "今天没有。" }), emptyCtx);
    expect(html).toContain("今天没有。");
    expect(html).not.toContain("useless-nav");
  });

  it("前后天渲染成 /YYYYMMDD", () => {
    const html = renderUselessTodayHtml(
      section(),
      ctxWith({ prev: "2026-08-26", next: "2026-08-28" }),
    );
    expect(html).toContain('href="/20260826"');
    expect(html).toContain('href="/20260828"');
  });

  it("没有前一天时占位但点不动", () => {
    const html = renderUselessTodayHtml(section(), ctxWith({ prev: null }));
    expect(html).toContain('aria-disabled="true"');
  });

  it("日期选择器是 GET form，关掉 JS 也能用", () => {
    const html = renderUselessTodayHtml(
      section(),
      ctxWith({ earliest: "2026-01-01", latest: "2026-08-27" }),
    );
    expect(html).toContain('method="get"');
    expect(html).toContain('type="date"');
    expect(html).toContain('min="2026-01-01"');
    expect(html).toContain('max="2026-08-27"');
  });

  it("看的是今天就不画「回到今天」", () => {
    expect(renderUselessTodayHtml(section(), ctxWith({ is_today: true }))).not.toContain(
      "useless-nav-today",
    );
    expect(renderUselessTodayHtml(section(), ctxWith({ is_today: false }))).toContain(
      "useless-nav-today",
    );
  });
});

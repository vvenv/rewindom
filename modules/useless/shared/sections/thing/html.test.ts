import { describe, expect, it } from "vitest";

import { renderUselessThingHtml } from "./html.js";

import type { UselessRenderContext } from "../../useless-section-context.js";
import type { SectionRenderContext } from "@rewindom/builtin/marketing/shared/sections/render-context.js";
import type { SiteSection } from "@rewindom/builtin/marketing/shared/section-schema.js";

function section(settings: Record<string, unknown> = {}): SiteSection {
  return {
    id: "sec-1",
    type: "useless.thing",
    settings,
    blocks: [],
  } as unknown as SiteSection;
}

const emptyCtx = {} as SectionRenderContext;

function ctxWith(patch: Partial<UselessRenderContext>) {
  const base: UselessRenderContext = {
    things: [],
    thing: null,
    labels: { empty: "没有这个。" },
  };
  return { contributed: { useless: { ...base, ...patch } } } as never;
}

const line = (text: string) =>
  ctxWith({
    thing: {
      kind: "text",
      slug: "line",
      href: "/line",
      title: "",
      text,
      html: "",
      thumbnail: "",
    },
  });

const embed = (html: string, title = "按钮") =>
  ctxWith({
    thing: {
      kind: "embed",
      slug: "btn",
      href: "/btn",
      title,
      text: "",
      html,
      thumbnail: "",
    },
  });

describe("无用之物详情 · 句子", () => {
  it("直接进 HTML —— 关掉 JS 也看得见", () => {
    const html = renderUselessThingHtml(section(), line("宜家的铅笔，你拿回家过。"));
    expect(html).toContain("宜家的铅笔，你拿回家过。");
    expect(html).toContain("useless-thing-text");
  });

  it("转义正文，不给注入留口子", () => {
    const html = renderUselessThingHtml(
      section(),
      line("<script>alert(1)</script>"),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("无用之物详情 · 可交互", () => {
  it("HTML **原样**进页面 —— 这是这个形态的全部意义", () => {
    const html = renderUselessThingHtml(section(), embed("<button>x</button>"));
    expect(html).toContain("<button>x</button>");
    expect(html).not.toContain("&lt;button&gt;");
  });

  it("不再套 iframe", () => {
    const html = renderUselessThingHtml(section(), embed("<button>x</button>"));
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("srcdoc");
  });

  it("包在 .useless-thing 容器里，容器 id 跟着段走", () => {
    const html = renderUselessThingHtml(section(), embed("<button>x</button>"));
    expect(html).toContain('class="useless-thing" id="ut-sec-1"');
  });

  it("舞台带 is-stage —— 铺满视口", () => {
    const html = renderUselessThingHtml(section(), embed("<button>x</button>"));
    expect(html).toContain('class="useless-stage is-stage"');
  });

  it("名字不进页面 —— 访客自己去摸，标题会把玩笑先说破", () => {
    const html = renderUselessThingHtml(
      section(),
      embed("<button>x</button>", "永远差一点的加载"),
    );
    expect(html).not.toContain("永远差一点的加载");
    expect(html).not.toContain("useless-thing-title");
  });
});

describe("无用之物详情 · 空态", () => {
  it("没有这件时出空态文案，而不是整段消失", () => {
    const html = renderUselessThingHtml(section(), ctxWith({ thing: null }));
    expect(html).toContain("没有这个。");
  });

  it("租户填了 empty_text 就用租户的", () => {
    const html = renderUselessThingHtml(
      section({ empty_text: "找不到。" }),
      ctxWith({ thing: null }),
    );
    expect(html).toContain("找不到。");
  });

  it("上下文缺失时不崩", () => {
    const html = renderUselessThingHtml(
      section({ empty_text: "没有这个。" }),
      emptyCtx,
    );
    expect(html).toContain("没有这个。");
  });
});

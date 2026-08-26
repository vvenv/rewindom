import { describe, expect, it } from "vitest";

import {
  emptyEventsContext,
  eventsContextEntry,
} from "../events-section-context.js";
import { renderEventsFeedHtml } from "./feed-html.js";

import type { PublicEventCard } from "../events-section-context.js";
import type { SiteSection } from "@rewindom/builtin/marketing/shared/section-schema.js";

function card(
  slug: string,
  overrides: Partial<PublicEventCard> = {},
): PublicEventCard {
  return {
    slug,
    href: `/events/${slug}`,
    title: `Title ${slug}`,
    headline: `Headline ${slug}`,
    topic: "ai",
    topic_label: "AI",
    status: "developing",
    status_label: "快速发展",
    momentum_label: "↑ 420%",
    fact_labels: [],
    momentum_rising: true,
    signal_count: 3,
    source_names: ["OpenAI"],
    source_icon_urls: [],
    last_activity_at: "2026-08-17T12:00:00.000Z",
    last_activity_label: "5 小时前",
    evidence_text: "",
    ...overrides,
  };
}

function section(
  source: string,
  limit: number,
  extra: Record<string, unknown> = {},
): SiteSection {
  const type =
    source === "now"
      ? "events.now"
      : source === "rising"
        ? "events.rising"
        : "events.feed";
  return {
    id: `s-${source}`,
    type,
    settings: {
      heading: source,
      source,
      limit,
      show_sources: true,
      empty_text: "暂无事件",
      more_label: "",
      ...extra,
    },
    blocks: [],
  };
}

function titlesIn(html: string): string[] {
  return [...html.matchAll(/class="events-title">([^<]*)/gu)].map((m) => m[1]);
}

describe("卡底那一行", () => {
  const ctxWith = (cards: ReturnType<typeof card>[]) => ({
    contributed: eventsContextEntry(
      emptyEventsContext({ feed: { rising: cards, now: [] } }),
    ),
  });

  it("时间跟来源同一行，且留一份机器可读的绝对时刻", () => {
    const html = renderEventsFeedHtml(
      section("rising", 5),
      ctxWith([card("a")]),
    );
    expect(html).toContain('datetime="2026-08-17T12:00:00.000Z"');
    // 同一个 <p> 里，不另起一行
    expect(html).toMatch(
      /<p class="events-sources"[^>]*>.*OpenAI.*<time[^>]*>5 小时前<\/time><\/p>/u,
    );
  });

  it("关掉来源时时间仍然画", () => {
    const html = renderEventsFeedHtml(
      section("rising", 5, { show_sources: false }),
      ctxWith([card("a")]),
    );
    expect(html).not.toContain("OpenAI");
    expect(html).toContain("5 小时前");
  });
});

describe("renderEventsFeedHtml", () => {
  it("段 type 决定取哪一批，不再读 source 下拉", () => {
    const context = emptyEventsContext({
      feed: {
        rising: [card("a")],
        now: [card("b")],
      },
    });
    const ctx = { contributed: eventsContextEntry(context) };
    expect(
      titlesIn(
        renderEventsFeedHtml(section("now", 5, { source: "rising" }), ctx),
      ),
    ).toEqual(["Title b"]);
  });

  it("同一页上两段不重复渲染同一个事件（默认版式就是两段同页）", () => {
    const hot = card("hot");
    const context = emptyEventsContext({
      feed: {
        rising: [hot, card("r2")],
        now: [hot, card("n2")],
      },
    });
    const risingSection = section("rising", 5);
    const nowSection = section("now", 5);
    const ctx = {
      contributed: eventsContextEntry(context),
      pageSections: [risingSection, nowSection],
    };

    const rising = titlesIn(renderEventsFeedHtml(risingSection, ctx));
    const now = titlesIn(renderEventsFeedHtml(nowSection, ctx));

    expect(rising).toEqual(["Title hot", "Title r2"]);
    expect(now).toEqual(["Title n2"]);
  });

  it("存量 source=today 读 now 这一批", () => {
    const context = emptyEventsContext({
      feed: {
        rising: [card("a")],
        now: [card("b"), card("c")],
      },
    });
    const ctx = { contributed: eventsContextEntry(context) };
    expect(titlesIn(renderEventsFeedHtml(section("today", 5), ctx))).toEqual([
      "Title b",
      "Title c",
    ]);
  });

  it("单独摆一段时拿到完整列表——去重不能反过来让内容变少", () => {
    const context = emptyEventsContext({
      feed: {
        rising: [card("a")],
        now: [card("a"), card("b"), card("c")],
      },
    });
    const ctx = { contributed: eventsContextEntry(context) };
    expect(titlesIn(renderEventsFeedHtml(section("now", 5), ctx))).toEqual([
      "Title a",
      "Title b",
      "Title c",
    ]);
  });

  it("去重按页面段树：另一页不受影响", () => {
    const build = () =>
      emptyEventsContext({
        feed: { rising: [card("a")], now: [] },
      });
    const firstSection = section("rising", 5);
    const secondSection = section("rising", 5);
    const first = {
      contributed: eventsContextEntry(build()),
      pageSections: [firstSection],
    };
    const second = {
      contributed: eventsContextEntry(build()),
      pageSections: [secondSection],
    };
    renderEventsFeedHtml(firstSection, first);
    expect(titlesIn(renderEventsFeedHtml(secondSection, second))).toEqual([
      "Title a",
    ]);
  });

  it("limit 生效", () => {
    const context = emptyEventsContext({
      feed: {
        rising: [card("a"), card("b"), card("c")],
        now: [],
      },
    });
    const ctx = { contributed: eventsContextEntry(context) };
    expect(
      titlesIn(renderEventsFeedHtml(section("rising", 2), ctx)),
    ).toHaveLength(2);
  });

  it("Rising 加量后 Now 仍能凑满自己的 limit——池子必须按前面可能占掉的条数加量", () => {
    const overlapping = Array.from({ length: 8 }, (_, index) =>
      card(`o${index + 1}`),
    );
    const extras = Array.from({ length: 8 }, (_, index) =>
      card(`n${index + 1}`),
    );
    const context = emptyEventsContext({
      feed: {
        rising: overlapping,
        now: [...overlapping, ...extras],
      },
    });
    const risingSection = section("rising", 8);
    const nowSection = section("now", 8);
    const ctx = {
      contributed: eventsContextEntry(context),
      pageSections: [risingSection, nowSection],
    };
    expect(titlesIn(renderEventsFeedHtml(risingSection, ctx))).toHaveLength(8);
    expect(titlesIn(renderEventsFeedHtml(nowSection, ctx))).toEqual(
      extras.map((item) => `Title ${item.slug}`),
    );
  });

  it("没有事件时渲染空态而不是空白", () => {
    const ctx = { contributed: eventsContextEntry(emptyEventsContext()) };
    const html = renderEventsFeedHtml(section("rising", 5), ctx);
    expect(html).toContain("暂无事件");
    expect(html).not.toContain("events-grid");
  });

  it("HTML 转义：标题里的尖括号不能变成标签", () => {
    const context = emptyEventsContext({
      feed: {
        rising: [{ ...card("x"), title: '<img src=x onerror="alert(1)">' }],
        now: [],
      },
    });
    const ctx = { contributed: eventsContextEntry(context) };
    const html = renderEventsFeedHtml(section("rising", 5), ctx);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("枢纽 URL 带了 topic 时，查看全部也要带上，不能掉回未过滤列表", () => {
    const context = emptyEventsContext({
      topic: "ai",
      feed: {
        rising: [card("a")],
        now: [],
      },
    });
    const ctx = { contributed: eventsContextEntry(context) };
    const html = renderEventsFeedHtml(
      section("rising", 5, { more_label: "查看全部事件" }),
      ctx,
    );
    expect(html).toContain('href="/topics/ai?source=rising"');
  });

  it("枢纽 URL 带了 topic 时只渲染该主题，即使 feed 里混了别的", () => {
    const context = emptyEventsContext({
      topic: "ai",
      feed: {
        rising: [
          { ...card("ai-1"), topic: "ai" },
          { ...card("tech-1"), topic: "tech", topic_label: "科技" },
        ],
        now: [],
      },
    });
    const ctx = { contributed: eventsContextEntry(context) };
    expect(titlesIn(renderEventsFeedHtml(section("rising", 5), ctx))).toEqual([
      "Title ai-1",
    ]);
  });

  it("查看全部带上当前区块的 source / topic", () => {
    const context = emptyEventsContext({
      feed: {
        rising: [card("a"), card("b")],
        now: [],
      },
    });
    const ctx = { contributed: eventsContextEntry(context) };
    const html = renderEventsFeedHtml(
      section("rising", 1, { more_label: "查看全部事件", topic: "ai" }),
      ctx,
    );
    expect(html).toContain('href="/topics/ai?source=rising"');
    expect(html).toContain("查看全部事件");
  });

  it("未选主题时查看全部链到 /?source=", () => {
    const context = emptyEventsContext({
      feed: { rising: [], now: [card("a")] },
    });
    const ctx = { contributed: eventsContextEntry(context) };
    const html = renderEventsFeedHtml(
      section("now", 5, { more_label: "查看全部事件" }),
      ctx,
    );
    expect(html).toContain('href="/?source=now"');
    expect(html).not.toContain("topic=");
  });

  it("区块 topic 只渲染该主题的卡片", () => {
    const context = emptyEventsContext({
      feed: {
        rising: [
          { ...card("ai-1"), topic: "ai" },
          { ...card("tech-1"), topic: "tech", topic_label: "科技" },
        ],
        now: [],
      },
    });
    const ctx = { contributed: eventsContextEntry(context) };
    expect(
      titlesIn(
        renderEventsFeedHtml(section("rising", 5, { topic: "ai" }), ctx),
      ),
    ).toEqual(["Title ai-1"]);
  });

  it("查询列表页不再截 limit，也不再画查看全部", () => {
    const context = emptyEventsContext({
      listing: { source: "rising" },
      feed: {
        rising: [card("a"), card("b"), card("c")],
        now: [],
      },
    });
    const ctx = { contributed: eventsContextEntry(context) };
    const html = renderEventsFeedHtml(
      section("rising", 1, { more_label: "查看全部事件" }),
      ctx,
    );
    expect(titlesIn(html)).toEqual(["Title a", "Title b", "Title c"]);
    expect(html).not.toContain("查看全部事件");
  });

  /*
   * 角标文案已经在 toPublicCard 里落成当前语言了（段渲染器是同步的、拿不到 i18n）。
   * 这里只钉两件事：文案原样渲染、空串留白。
   */
  it("势头角标原样渲染，涨的带 up 配色", () => {
    const html = renderCards([
      card("a", {
        evidence_text: "已证实 · 3 家来源",
        momentum_label: "3 个来源正在跟进",
        momentum_rising: true,
      }),
    ]);
    expect(html).toContain(
      '<span class="events-velocity up">3 个来源正在跟进</span>',
    );
  });

  it("下降不带 up 配色", () => {
    const html = renderCards([
      card("a", {
        fact_labels: ["故障"],
        momentum_label: "↓ 62%",
        momentum_rising: false,
      }),
    ]);
    expect(html).toContain('<span class="events-velocity">↓ 62%</span>');
  });

  it("没有可主张的变化时整个角标不出现——留白比写「持平」更权威", () => {
    const html = renderCards([
      card("a", {
        evidence_text: "已证实 · 2 家来源",
        momentum_label: "",
        momentum_rising: false,
      }),
    ]);
    expect(html).not.toContain("events-velocity");
  });

  it("薄卡不画阶段、主题、摘要和势头——只留标题与来源", () => {
    const html = renderCards([
      card("a", {
        evidence_text: "",
        fact_labels: [],
        headline: "Should not show",
        momentum_label: "↑ 420%",
      }),
    ]);
    expect(html).toContain('class="events-card events-card-thin"');
    expect(html).not.toContain("events-card-thick");
    expect(html).not.toContain("events-status");
    expect(html).not.toContain("events-topic");
    expect(html).not.toContain("Should not show");
    expect(html).not.toContain("events-velocity");
    expect(html).toContain("Title a");
    expect(html).toContain("OpenAI");
  });

  it("厚卡把证据画成 meta 行角标，不把 headline 再画一遍", () => {
    const html = renderCards([
      card("a", {
        evidence_text: "Cloudflare 近 90 天第 4 次故障",
        headline: "Should stay in the detail page",
      }),
    ]);
    expect(html).toContain('class="events-card events-card-thick"');
    expect(html).toContain(
      '<span class="events-evidence">Cloudflare 近 90 天第 4 次故障</span>',
    );
    expect(html.indexOf("events-evidence")).toBeLessThan(
      html.indexOf("events-title"),
    );
    expect(html).not.toContain("Should stay in the detail page");
  });

  it("来源 icon 走本站路径，不打 Google", () => {
    const html = renderCards([
      card("a", {
        source_names: ["OpenAI"],
        source_icon_urls: ["/events/icons/openai.com"],
      }),
    ]);
    expect(html).toContain('src="/events/icons/openai.com"');
    expect(html).toContain('class="events-source-icon"');
    expect(html).toContain("events-source-icon-fallback");
    expect(html).not.toContain("google.com/s2");
  });

  it("没有 icon URL 时仍画首字母占位", () => {
    const html = renderCards([
      card("a", {
        source_names: ["OpenAI"],
        source_icon_urls: [null],
      }),
    ]);
    expect(html).toContain("events-source-icon-slot");
    expect(html).toContain(
      '<span class="events-source-icon-fallback">O</span>',
    );
    expect(html).not.toContain("<img");
  });

  it("来源封顶三家，其余收成 +N——列九家会把标题压成次要信息", () => {
    const html = renderCards([
      card("a", {
        source_names: [
          "Variety",
          "The Hollywood Reporter",
          "Screen Rant",
          "Hacker News",
          "IGN",
          "Polygon",
        ],
        source_icon_urls: [],
      }),
    ]);
    expect(html).toContain("Variety");
    expect(html).toContain("Screen Rant");
    expect(html).not.toContain("Polygon");
    expect(html).toContain('<span class="events-source-more">+3</span>');
    expect(html.match(/events-source-icon-slot/g)?.length).toBe(3);
  });

  it("时间仍挂在来源行末尾，+N 排在它前面", () => {
    const html = renderCards([
      card("a", {
        source_names: ["A", "B", "C", "D"],
        source_icon_urls: [],
      }),
    ]);
    expect(html.indexOf("events-source-more")).toBeLessThan(
      html.indexOf("events-card-time"),
    );
  });
});

function renderCards(cards: PublicEventCard[]): string {
  const context = emptyEventsContext({ feed: { rising: cards, now: [] } });
  return renderEventsFeedHtml(section("rising", 5), {
    contributed: eventsContextEntry(context),
  });
}

/*
 * 主题强调色。
 *
 * 上一版这里测的是一枚 56px 渐变方块（「程序化题图」），实测把卡片挤变形了，
 * 已经删掉——它抢宽度、又不携带信息。留下的是那套色里唯一有用的部分：
 * 主题 → 色相，画成卡顶一条线，零宽度成本。
 */
describe("renderEventsFeedHtml · 主题强调色", () => {
  it("puts the topic hue on every card", () => {
    const html = renderCards([card("a", { topic: "ai" })]);
    expect(html).toContain("--topic-hue:244");
  });

  /* 主题是事件的属性，不是「这条够不够厚」的属性——厚薄卡都上色。 */
  it("colours thin cards too", () => {
    const html = renderCards([
      card("a", { topic: "gaming", evidence_text: "" }),
    ]);
    expect(html).toContain("events-card-thin");
    expect(html).toContain("--topic-hue:292");
  });

  it("gives different topics different hues", () => {
    const ai = renderCards([card("a", { topic: "ai" })]);
    const world = renderCards([card("a", { topic: "world" })]);
    expect(ai).not.toBe(world);
    expect(world).toContain("--topic-hue:34");
  });

  /* 同一主题的事件就是同一条色：抖动只会让一排细线看起来像没对齐。 */
  it("gives one topic exactly one hue", () => {
    const first = renderCards([card("slug-one", { topic: "tech" })]);
    const second = renderCards([card("slug-two", { topic: "tech" })]);
    expect(first.match(/--topic-hue:\d+/u)?.[0]).toBe(
      second.match(/--topic-hue:\d+/u)?.[0],
    );
  });

  /* 没有第二层包裹、没有图：卡片 markup 回到加题图之前那一份。 */
  it("adds no wrapper and no image to the card", () => {
    const html = renderCards([card("a", { evidence_text: "已证实 · 3 家来源" })]);
    expect(html).not.toContain("events-card-body");
    expect(html).not.toContain("events-cover");
    expect(html).not.toContain("<img");
  });
});

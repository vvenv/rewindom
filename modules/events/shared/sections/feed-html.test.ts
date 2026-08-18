import { describe, expect, it } from "vitest";

import { emptyEventsContext, eventsContextEntry } from "../events-section-context.js";
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
    momentum_rising: true,
    signal_count: 3,
    source_names: ["OpenAI"],
    last_activity_at: "2026-08-17T12:00:00.000Z",
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
        renderEventsFeedHtml(
          section("now", 5, { source: "rising" }),
          ctx,
        ),
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
    const ctx = { contributed: eventsContextEntry(context) };

    const rising = titlesIn(renderEventsFeedHtml(section("rising", 5), ctx));
    const now = titlesIn(renderEventsFeedHtml(section("now", 5), ctx));

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

  it("去重按上下文分桶：另一个请求不受影响", () => {
    const build = () =>
      emptyEventsContext({
        feed: { rising: [card("a")], now: [] },
      });
    const first = { contributed: eventsContextEntry(build()) };
    const second = { contributed: eventsContextEntry(build()) };
    renderEventsFeedHtml(section("rising", 5), first);
    expect(titlesIn(renderEventsFeedHtml(section("rising", 5), second))).toEqual([
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
    expect(titlesIn(renderEventsFeedHtml(section("rising", 2), ctx))).toHaveLength(2);
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
    expect(html).toContain('href="/events?source=rising&amp;topic=ai"');
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
    expect(html).toContain('href="/events?source=rising&amp;topic=ai"');
    expect(html).toContain("查看全部事件");
  });

  it("未选主题时只带 source，才能和枢纽 /events 分开", () => {
    const context = emptyEventsContext({
      feed: { rising: [], now: [card("a")] },
    });
    const ctx = { contributed: eventsContextEntry(context) };
    const html = renderEventsFeedHtml(
      section("now", 5, { more_label: "查看全部事件" }),
      ctx,
    );
    expect(html).toContain('href="/events?source=now"');
    expect(html).not.toContain("topic=");
  });

  it("枢纽当首页时查看全部链到 /?source=", () => {
    const context = emptyEventsContext({
      index_path: "/",
      feed: { rising: [], now: [card("a")] },
    });
    const ctx = { contributed: eventsContextEntry(context) };
    const html = renderEventsFeedHtml(
      section("now", 5, { more_label: "查看全部事件" }),
      ctx,
    );
    expect(html).toContain('href="/?source=now"');
    expect(html).not.toContain("/events?");
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
      titlesIn(renderEventsFeedHtml(section("rising", 5, { topic: "ai" }), ctx)),
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
      card("a", { momentum_label: "3 个来源正在跟进", momentum_rising: true }),
    ]);
    expect(html).toContain('<span class="events-velocity up">3 个来源正在跟进</span>');
  });

  it("下降不带 up 配色", () => {
    const html = renderCards([
      card("a", { momentum_label: "↓ 62%", momentum_rising: false }),
    ]);
    expect(html).toContain('<span class="events-velocity">↓ 62%</span>');
  });

  it("没有可主张的变化时整个角标不出现——留白比写「持平」更权威", () => {
    const html = renderCards([
      card("a", { momentum_label: "", momentum_rising: false }),
    ]);
    expect(html).not.toContain("events-velocity");
  });
});

function renderCards(cards: PublicEventCard[]): string {
  const context = emptyEventsContext({ feed: { rising: cards, now: [] } });
  return renderEventsFeedHtml(section("rising", 5), {
    contributed: eventsContextEntry(context),
  });
}


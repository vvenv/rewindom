import { describe, expect, it } from "vitest";

import { emptyEventsContext, eventsContextEntry } from "../events-section-context.js";
import { renderEventsFeedHtml } from "./feed-html.js";

import type { PublicEventCard } from "../events-section-context.js";
import type { SiteSection } from "@rewindom/builtin/marketing/shared/section-schema.js";

function card(slug: string): PublicEventCard {
  return {
    slug,
    href: `/events/${slug}`,
    title: `Title ${slug}`,
    headline: `Headline ${slug}`,
    topic: "ai",
    topic_label: "AI",
    status: "developing",
    status_label: "快速发展",
    velocity_pct: 420,
    signal_count: 3,
    source_names: ["OpenAI"],
    last_activity_at: "2026-08-17T12:00:00.000Z",
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
});

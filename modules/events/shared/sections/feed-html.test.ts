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

function section(source: string, limit: number): SiteSection {
  return {
    id: `s-${source}`,
    type: "events.feed",
    settings: {
      heading: source,
      source,
      limit,
      show_sources: true,
      empty_text: "暂无事件",
      more_label: "",
    },
    blocks: [],
  };
}

function titlesIn(html: string): string[] {
  return [...html.matchAll(/class="events-title">([^<]*)/gu)].map((m) => m[1]);
}

describe("renderEventsFeedHtml", () => {
  it("按 source 取对应的一批", () => {
    const context = emptyEventsContext({
      feed: {
        rising: [card("a")],
        now: [card("b")],
        today: [card("c")],
        today_total: 3,
      },
    });
    const ctx = { contributed: eventsContextEntry(context) };
    expect(titlesIn(renderEventsFeedHtml(section("now", 5), ctx))).toEqual([
      "Title b",
    ]);
  });

  it("同一页上三段不重复渲染同一个事件（默认版式就是三段同页）", () => {
    // 同一个事件同时命中三段——不去重的话页面上会出现三张一模一样的卡片
    const hot = card("hot");
    const context = emptyEventsContext({
      feed: {
        rising: [hot, card("r2")],
        now: [hot, card("n2")],
        today: [hot, card("t2")],
        today_total: 4,
      },
    });
    const ctx = { contributed: eventsContextEntry(context) };

    const rising = titlesIn(renderEventsFeedHtml(section("rising", 5), ctx));
    const now = titlesIn(renderEventsFeedHtml(section("now", 5), ctx));
    const today = titlesIn(renderEventsFeedHtml(section("today", 5), ctx));

    expect(rising).toEqual(["Title hot", "Title r2"]);
    expect(now).toEqual(["Title n2"]);
    expect(today).toEqual(["Title t2"]);
  });

  it("单独摆一段时拿到完整列表——去重不能反过来让内容变少", () => {
    const context = emptyEventsContext({
      feed: {
        rising: [card("a")],
        now: [card("a"), card("b")],
        today: [card("a"), card("b"), card("c")],
        today_total: 3,
      },
    });
    const ctx = { contributed: eventsContextEntry(context) };
    expect(titlesIn(renderEventsFeedHtml(section("today", 5), ctx))).toEqual([
      "Title a",
      "Title b",
      "Title c",
    ]);
  });

  it("去重按上下文分桶：另一个请求不受影响", () => {
    const build = () =>
      emptyEventsContext({
        feed: { rising: [card("a")], now: [], today: [], today_total: 1 },
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
        today: [],
        today_total: 3,
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
        today: [],
        today_total: 1,
      },
    });
    const ctx = { contributed: eventsContextEntry(context) };
    const html = renderEventsFeedHtml(section("rising", 5), ctx);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});

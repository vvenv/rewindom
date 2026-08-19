import { describe, expect, it } from "vitest";

import { emptyEventsContext, eventsContextEntry } from "../events-section-context.js";
import { EVENTS_ENTITY_SECTION_TYPE } from "../events-entity-section.js";
import { renderEventsEntityHtml } from "./entity-html.js";

import type {
  PublicEntityView,
  PublicEventCard,
} from "../events-section-context.js";
import type { SiteSection } from "@rewindom/builtin/marketing/shared/section-schema.js";

function card(slug: string, overrides: Partial<PublicEventCard> = {}): PublicEventCard {
  return {
    slug,
    href: `/events/${slug}`,
    title: `Title ${slug}`,
    headline: `Headline ${slug}`,
    topic: "ai",
    topic_label: "AI",
    status: "developing",
    status_label: "快速发展",
    momentum_label: "3 个来源正在跟进",
    momentum_rising: true,
    signal_count: 3,
    source_names: ["OpenAI", "TechCrunch"],
    last_activity_at: "2026-08-17T12:00:00.000Z",
    ...overrides,
  };
}

function entity(overrides: Partial<PublicEntityView> = {}): PublicEntityView {
  return {
    slug: "openai-abc123",
    href: "/events/entities/openai-abc123",
    feed_href: "/events/entities/openai-abc123/feed.xml",
    name: "OpenAI",
    kind_label: "公司",
    event_count: 2,
    profile: [],
    events: [card("a"), card("b")],
    ...overrides,
  };
}

function section(extra: Record<string, unknown> = {}): SiteSection {
  return {
    id: "s-entity",
    type: EVENTS_ENTITY_SECTION_TYPE,
    settings: {
      events_label: "相关事件",
      show_sources: true,
      empty_text: "这个实体还没有关联的事件",
      ...extra,
    },
  } as SiteSection;
}

function render(view: PublicEntityView | null, extra: Record<string, unknown> = {}) {
  const context = emptyEventsContext({ entity: view });
  return renderEventsEntityHtml(section(extra), {
    contributed: eventsContextEntry(context),
  });
}

describe("renderEventsEntityHtml", () => {
  it("画出实体名与类型", () => {
    const html = render(entity());
    expect(html).toContain(">OpenAI</h1>");
    expect(html).toContain(">公司</p>");
  });

  it("列出事件，链接指向站内详情页", () => {
    const html = render(entity());
    expect(html).toContain('href="/events/a"');
    expect(html).toContain('href="/events/b"');
  });

  /*
   * 与「正在发生什么」区块共用 .events-card，不另起一套样式；
   * 势头角标也保留——实体页上「哪几件事正在扩散」和首页上一样重要。
   */
  it("卡片沿用 events-card，并保留势头角标", () => {
    const html = render(entity());
    expect(html).toContain('class="events-card"');
    expect(html).toContain("3 个来源正在跟进");
  });

  /*
   * 实体页真正的价值在**累计**而不在下面那个按时间排的列表——
   * 「这家近 90 天出过几次故障、累计多久」是列表回答不了的。
   */
  it("画出累计档案", () => {
    const html = render(entity({ profile: ["近 90 天 12 件事", "故障 3 次"] }));
    expect(html).toContain("events-profile");
    expect(html).toContain("近 90 天 12 件事");
    expect(html).toContain("故障 3 次");
  });

  /* 窗口内不足两件事时 service 给空数组，这里整块不画，而不是画一个空 ul。 */
  it("没有档案时整块不渲染", () => {
    expect(render(entity())).not.toContain("events-profile");
  });

  it("档案文案转义，不让数据带出标签", () => {
    expect(render(entity({ profile: ["<b>3</b> 次"] }))).not.toContain("<b>");
  });

  it("关掉来源开关后不画来源", () => {
    expect(render(entity(), { show_sources: false })).not.toContain("events-sources");
  });

  it("没有事件时画空态", () => {
    const html = render(entity({ events: [], event_count: 0 }));
    expect(html).toContain("这个实体还没有关联的事件");
    expect(html).not.toContain("events-grid");
  });

  /*
   * 段被摆到别的页面（或预览没给样张）时没有「当前实体」——
   * 整段不渲染，而不是画一块空白。与详情段同一条口径。
   */
  it("没有当前实体时整段不渲染", () => {
    expect(render(null)).toBe("");
  });

  /*
   * 订阅入口不在这个段里：它是**页面级**的（`events.subscribe`），
   * 摆一次、按上下文挑地址。曾经做成段设置，结果两段同页时画了两个。
   */
  it("不自己画订阅入口——那由独立的订阅段负责", () => {
    expect(render(entity())).not.toContain("events-subscribe");
  });

  it("实体名转义，不让数据带出标签", () => {
    const html = render(entity({ name: "<script>x</script>" }));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

});

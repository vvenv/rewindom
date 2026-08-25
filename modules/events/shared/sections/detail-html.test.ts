import { describe, expect, it } from "vitest";

import {
  emptyEventsContext,
  eventsContextEntry,
} from "../events-section-context.js";
import { EVENTS_DETAIL_SECTION_TYPE } from "../events-detail-section.js";
import { renderEventsDetailHtml } from "./detail-html.js";

import type { PublicEventDetailView } from "../events-section-context.js";
import type { SiteSection } from "@rewindom/builtin/marketing/shared/section-schema.js";

function detail(
  overrides: Partial<PublicEventDetailView> = {},
): PublicEventDetailView {
  return {
    slug: "openai-ships-abc123",
    href: "/events/openai-ships-abc123",
    title: "OpenAI ships something",
    headline: "",
    topic: "ai",
    topic_label: "AI",
    status: "developing",
    status_label: "快速发展",
    momentum_label: "",
    momentum_rising: true,
    signal_count: 3,
    source_names: ["OpenAI"],
    source_icon_urls: [],
    last_activity_at: "2026-08-17T12:00:00.000Z",
    fact_labels: [],
    evidence_text: "",
    summary: "摘要",
    analyzer: "heuristic",
    provenance_note: "规则整理",
    first_seen_at: "2026-08-17T10:00:00.000Z",
    timeline: [],
    placement: [],
    source_groups: [],
    related: [],
    why_trending: [],
    entities: [
      { href: "/entities/openai-abc123", name: "OpenAI" },
      { href: "/entities/microsoft-def456", name: "Microsoft" },
    ],
    ...overrides,
  } as PublicEventDetailView;
}

function section(): SiteSection {
  return {
    id: "s-detail",
    type: EVENTS_DETAIL_SECTION_TYPE,
    settings: {
      summary_label: "发生了什么",
      show_timeline: true,
      timeline_label: "时间线",
      show_sources: true,
      sources_label: "来源",
      show_related: true,
      related_label: "相关事件",
      show_why: true,
      why_label: "为什么在扩散",
    },
  } as SiteSection;
}

function render(
  view: PublicEventDetailView | null,
  interpolation?: { url: string },
) {
  const context = emptyEventsContext({ event: view });
  return renderEventsDetailHtml(section(), {
    contributed: eventsContextEntry(context),
    interpolation,
  });
}

describe("renderEventsDetailHtml entities", () => {
  it("links the entities it mentions — the only in-site path to entity pages", () => {
    const html = render(detail());
    expect(html).toContain('href="/entities/openai-abc123"');
    expect(html).toContain(">OpenAI</a>");
    expect(html).toContain(">Microsoft</a>");
  });

  it("renders nothing when no entity was extracted", () => {
    const html = render(detail({ entities: [] }));
    expect(html).not.toContain("events-entity-chips");
  });
});

describe("renderEventsDetailHtml related", () => {
  it("按时间升序排，带日期和类型事实，不解释为什么相关", () => {
    const html = render(
      detail({
        related: [
          {
            href: "/events/later",
            title: "Later event",
            last_activity_at: "2026-08-18T12:00:00.000Z",
            fact_labels: [],
          },
          {
            href: "/events/earlier",
            title: "Earlier outage",
            last_activity_at: "2026-08-12T08:00:00.000Z",
            fact_labels: ["故障", "47 分钟"],
          },
        ],
      }),
    );
    expect(html).toContain("2026-08-12");
    expect(html).toContain("故障");
    expect(html.indexOf("Earlier outage")).toBeLessThan(
      html.indexOf("Later event"),
    );
    expect(html).not.toContain("为什么相关");
  });

  it("没有相关事件时整块不渲染", () => {
    const html = render(detail({ related: [] }));
    expect(html).not.toContain("events-related");
  });
});

describe("renderEventsDetailHtml timeline", () => {
  function entry(
    overrides: Partial<PublicEventDetailView["timeline"][number]> = {},
  ): PublicEventDetailView["timeline"][number] {
    return {
      occurred_at: "2026-08-17T10:02:00.000Z",
      role_label: "新细节",
      role: "newDetail",
      label: "Adds a $2B earnout in the deal.",
      source_name: "The Verge",
      source_kind: "news",
      icon_url: null,
      url: "https://example.com/story",
      incident_updates: [],
      ...overrides,
    };
  }

  /** 两格起才画板块（见 showsTimelineBlock），行内 markup 的用例都配两格。 */
  const pair = (
    first: Partial<PublicEventDetailView["timeline"][number]> = {},
  ): PublicEventDetailView["timeline"][number][] => [
    entry(first),
    entry({
      occurred_at: "2026-08-17T12:30:00.000Z",
      role_label: "进展",
      role: "update",
      label: "Regulators confirm the filing.",
      source_name: "Reuters",
    }),
  ];

  it("shows the new detail as text and the outlet as the citation", () => {
    const html = render(detail({ timeline: pair() }));
    expect(html).toContain("events-timeline-role");
    expect(html).toContain(">新细节</span>");
    expect(html).toContain("Adds a $2B earnout in the deal.");
    expect(html).toContain('href="https://example.com/story"');
    expect(html).toContain(">The Verge</a>");
    expect(html).not.toContain('href="https://example.com/story">Adds a $2B');
  });

  it("marks differing accounts without wrapping the insight in the link", () => {
    const html = render(
      detail({
        timeline: pair({
          role_label: "说法不一",
          role: "conflict",
          label:
            "Reuters reports the deal is off; The Verge says talks continue.",
        }),
      }),
    );
    expect(html).toContain("events-timeline-role-conflict");
    expect(html).toContain("Reuters reports the deal is off");
  });

  /*
   * 一格不成线。本地库 99% 的事件时间线只有一格，而那一格的信息
   * （时刻 + 来源）与下面的「来源」板块逐字重复。
   */
  it("只有一格时整块不渲染 —— 那条信息在「来源」里一模一样", () => {
    const html = render(detail({ timeline: [entry()] }));
    expect(html).not.toContain("events-timeline");
    // 板块标题也不该留下
    expect(html).not.toContain("时间线");
  });

  it("一格但带一手更新序列时照画 —— 那本来就是一条真时间线", () => {
    const html = render(
      detail({
        timeline: [
          entry({
            incident_updates: [
              {
                occurred_at: "2026-08-17T10:02:00.000Z",
                phase: "Investigating",
                text: "We are investigating elevated error rates.",
                time_label: "10:02",
              },
              {
                occurred_at: "2026-08-17T10:49:00.000Z",
                phase: "Resolved",
                text: "This incident has been resolved.",
                time_label: "10:49",
              },
            ],
          }),
        ],
      }),
    );
    expect(html).toContain("events-timeline");
    expect(html).toContain("This incident has been resolved.");
  });
});

describe("renderEventsDetailHtml json-ld", () => {
  it("emits Article JSON-LD with citation URLs when sources exist", () => {
    const html = render(
      detail({
        source_groups: [
          {
            kind: "official",
            label: "Official",
            items: [
              {
                title: "Announcement",
                url: "https://openai.com/news/announcement",
                source_name: "OpenAI",
                source_kind: "official",
                icon_url: null,
                published_at: "2026-08-17T10:00:00.000Z",
                published_label: "2 小时前",
              },
            ],
          },
        ],
      }),
      { url: "https://example.com" },
    );
    const match = html.match(
      /<script type="application\/ld\+json">([^<]+)<\/script>/,
    );
    expect(match).not.toBeNull();
    const payload = JSON.parse(match![1]!) as {
      "@type": string;
      url: string;
      citation: string[];
      isBasedOn: string[];
    };
    expect(payload["@type"]).toBe("Article");
    expect(payload.url).toBe("https://example.com/events/openai-ships-abc123");
    expect(payload.citation).toEqual(["https://openai.com/news/announcement"]);
    expect(payload.isBasedOn).toEqual(payload.citation);
  });

  it("skips JSON-LD when there are no source URLs", () => {
    const html = render(detail(), { url: "https://example.com" });
    expect(html).not.toContain("application/ld+json");
  });
});

describe("renderEventsDetailHtml why trending", () => {
  it("links the fact text when a source URL exists", () => {
    const html = render(
      detail({
        why_trending: [
          {
            text: "OpenAI published a first-party announcement",
            confidence: "confirmed",
            confidence_label: "Confirmed",
            href: "https://openai.com/news/announcement",
          },
        ],
      }),
    );
    expect(html).toContain('class="events-why-cite"');
    expect(html).toContain('href="https://openai.com/news/announcement"');
    expect(html).toContain(">OpenAI published a first-party announcement</a>");
  });

  it("keeps the fact as plain text when there is no URL", () => {
    const html = render(
      detail({
        why_trending: [
          {
            text: "Community discussion only",
            confidence: "discussion",
            confidence_label: "Discussion",
          },
        ],
      }),
    );
    expect(html).toContain("Community discussion only");
    expect(html).not.toContain("events-why-cite");
  });
});

describe("renderEventsDetailHtml sources", () => {
  function sourceGroups() {
    return [
      {
        kind: "official" as const,
        label: "Official",
        items: [
          {
            title: "Announcement",
            url: "https://openai.com/news/announcement",
            source_name: "OpenAI",
            source_kind: "official" as const,
            icon_url: null,
            published_at: "2026-08-17T10:00:00.000Z",
            published_label: "2 小时前",
          },
        ],
      },
      {
        kind: "news" as const,
        label: "News",
        items: [
          {
            title: "Coverage",
            url: "https://example.com/coverage",
            source_name: "Example",
            source_kind: "news" as const,
            icon_url: null,
            published_at: "2026-08-17T11:00:00.000Z",
            published_label: "1 小时前",
          },
        ],
      },
    ];
  }

  /*
   * 一份证据列表不说每条是什么时候发的，读者没法判断哪条还算数、哪条是三天前的旧稿。
   * `published_at` 一直在数据上，公开面从来没画过（与卡片补时间同一条口径）。
   */
  it("dates every source — 读者看相对时间，爬虫读 <time datetime>", () => {
    const html = render(detail({ source_groups: sourceGroups() }));
    expect(html).toContain(
      '<time class="events-source-time" datetime="2026-08-17T10:00:00.000Z">2 小时前</time>',
    );
    expect(html).toContain(">1 小时前</time>");
  });

  /* 组间距归外层容器：每组自己挂 margin 会和 `.events-block` 的 gap 叠加，末组还多一截。 */
  it("wraps the groups so spacing comes from one container", () => {
    const html = render(detail({ source_groups: sourceGroups() }));
    expect(html).toContain('<div class="events-source-groups">');
    expect(html.match(/class="events-source-group"/g)).toHaveLength(2);
  });
});

/*
 * 板块标题只有一套规格。原来「发生了什么 / 时间线 / 来源」是 `.events-block-title`，
 * 「为什么在扩散 / 相关事件」另起了 `.events-why-title` / `.events-related-title`——
 * 同一页两套二级标题。工作台那份是同一次疏漏（`text-sm uppercase` vs `text-base`）。
 */
describe("renderEventsDetailHtml block titles", () => {
  it("labels every block with the same class", () => {
    const html = render(
      detail({
        why_trending: [
          {
            text: "Community discussion only",
            confidence: "discussion",
            confidence_label: "Discussion",
          },
        ],
        related: [
          {
            href: "/events/other-def456",
            title: "Other",
            last_activity_at: "2026-08-16T12:00:00.000Z",
            fact_labels: [],
          },
        ],
      }),
    );
    expect(html).not.toContain("events-why-title");
    expect(html).not.toContain("events-related-title");
    expect(html).toContain('<h2 class="events-block-title">为什么在扩散</h2>');
    expect(html).toContain('<h2 class="events-block-title">相关事件</h2>');
  });
});

/*
 * 详情页题头 = 一块版面，不是一张图。
 *
 * 上一版在标题上面另放一张按 slug 生成的渐变图，占掉首屏最贵的一块却什么都不说，
 * 已经删掉。主题色现在只作为题头的底与左边那条竖线。
 */
describe("renderEventsDetailHtml · 题头", () => {
  it("tints the header with the event's topic hue", () => {
    const html = render(detail());
    expect(html).toContain("events-detail-header");
    expect(html).toMatch(/--topic-hue:\d+/u);
  });

  it("no longer paints a generated cover above the title", () => {
    const html = render(detail());
    expect(html).not.toContain("events-detail-cover");
    expect(html).not.toContain("events-cover");
  });

  /* 单来源事件的那张标毫无歧义地等于「这条是谁发的」。 */
  it("shows the publisher logo on a single-source event", () => {
    const html = render(
      detail({
        source_names: ["Cloudflare Status"],
        source_icon_urls: ["/events/icons/cloudflare.com"],
      }),
    );
    expect(html).toContain("events-detail-logo");
    expect(html).toContain("/events/icons/cloudflare.com");
  });

  /* 多来源事件取第一张图是在编一个它没有的主角。 */
  it("shows none on a multi-source event", () => {
    const html = render(
      detail({
        source_names: ["Reuters", "The Verge"],
        source_icon_urls: [
          "/events/icons/reuters.com",
          "/events/icons/theverge.com",
        ],
      }),
    );
    expect(html).not.toContain("events-detail-logo");
  });

  /* 一张画不出来的标志比没有标志更像故障。 */
  it("removes the whole box when the logo fails to load", () => {
    const html = render(
      detail({
        source_names: ["Cloudflare Status"],
        source_icon_urls: ["/events/icons/cloudflare.com"],
      }),
    );
    expect(html).toContain('onerror="this.parentElement.remove()"');
  });
});

/*
 * 原文插图。
 *
 * 署名与回链是 markup 的一部分，不是可选装饰——带出处的链接预览是全网惯例，
 * 不带出处的大图铺在正文里就是转载。这两者的距离全部在那一行字上。
 */
describe("renderEventsDetailHtml · 原文插图", () => {
  const image = {
    url: "https://cdn.example.com/hero.jpg",
    fallback_url: "/events/images/aGVyby5qcGc",
    credit: "图：Reuters",
    source_href: "https://reuters.example/a",
  };

  it("draws nothing when the event has no image", () => {
    expect(render(detail({ image: null }))).not.toContain("events-figure");
  });

  it("hotlinks the publisher's own address", () => {
    const html = render(detail({ image }));
    expect(html).toContain('src="https://cdn.example.com/hero.jpg"');
  });

  it("always credits the source and links back to the original", () => {
    const html = render(detail({ image }));
    expect(html).toContain("图：Reuters");
    expect(html).toContain('href="https://reuters.example/a"');
    expect(html).toContain("<figcaption");
  });

  /* 换过一次就打标；否则代理也失败时同一个 src 会被无限重试。 */
  it("falls back to the proxy exactly once, then removes the figure", () => {
    const html = render(detail({ image }));
    expect(html).toContain("data-fallback=");
    expect(html).toContain("/events/images/aGVyby5qcGc");
    expect(html).toContain("dataset.fellBack");
    expect(html).toContain("closest(&#39;figure&#39;).remove()");
  });

  /* 不把读者所在页告诉对方（与来源 favicon 同一条）。 */
  it("sends no referrer and loads lazily", () => {
    const html = render(detail({ image }));
    expect(html).toContain('referrerpolicy="no-referrer"');
    expect(html).toContain('loading="lazy"');
  });

  /* 图在题头之后、摘要之前。 */
  it("sits between the header and the summary", () => {
    const html = render(detail({ image }));
    expect(html.indexOf("events-detail-header")).toBeLessThan(
      html.indexOf("events-figure"),
    );
    expect(html.indexOf("events-figure")).toBeLessThan(
      html.indexOf("events-summary"),
    );
  });

  it("escapes every part of it — all three fields are third-party data", () => {
    const html = render(
      detail({
        image: {
          url: '/a.jpg" onload="alert(1)',
          fallback_url: '/b.jpg" onload="alert(2)',
          credit: "<script>alert(3)</script>",
          source_href: 'https://x.example" onclick="alert(4)',
        },
      }),
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('onload="alert');
    expect(html).not.toContain('onclick="alert');
  });
});

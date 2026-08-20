import { describe, expect, it } from "vitest";

import {
  emptyEventsContext,
  eventsContextEntry,
} from "../events-section-context.js";
import { EVENTS_HERO_SECTION_TYPE } from "../events-hero-section.js";
import { toPublicHero } from "../public-view.js";
import { renderEventsHeroHtml } from "./hero-html.js";

import type { PublicHeroView } from "../events-section-context.js";
import type { HeroStatsInput } from "../public-view.js";
import type { SiteSection } from "@rewindom/builtin/marketing/shared/section-schema.js";

const t = (key: string, params?: Record<string, string | number>): string =>
  params ? `${key}(${Object.values(params).join(",")})` : key;

const NOW = Date.parse("2026-08-19T12:00:00.000Z");

function hero(overrides: Partial<HeroStatsInput> = {}) {
  return toPublicHero(
    {
      live_events: 37,
      merged_reports: 1284,
      sources: 18,
      updated_at: "2026-08-19T11:54:00.000Z",
      ...overrides,
    },
    t,
    NOW,
  );
}

function section(extra: Record<string, unknown> = {}): SiteSection {
  return {
    id: "s-hero",
    type: EVENTS_HERO_SECTION_TYPE,
    settings: {
      eyebrow: "事件雷达 · 持续追踪",
      headline: "同一件事，来自多个来源，合成一条时间线",
      subhead: "不是热榜。",
      show_stats: true,
      primary_label: "它是怎么工作的",
      primary_href: "/about",
      secondary_label: "订阅 RSS",
      secondary_href: "{feed}",
      ...extra,
    },
  } as SiteSection;
}

function render(
  view: PublicHeroView | null,
  extra: Record<string, unknown> = {},
  topic?: { topic: "ai"; topic_label: string },
) {
  return renderEventsHeroHtml(section(extra), {
    contributed: eventsContextEntry(
      emptyEventsContext({ hero: view, ...(topic ?? {}) }),
    ),
  });
}

const AI = { topic: "ai" as const, topic_label: "AI" };

describe("renderEventsHeroHtml", () => {
  it("renders the headline as the page h1 — the home page had no h1 at all before", () => {
    const html = render(hero());
    expect(html).toContain(
      '<h1 class="events-hero-headline">同一件事，来自多个来源，合成一条时间线</h1>',
    );
  });

  it("paints every live count plus the CTA", () => {
    const html = render(hero());
    expect(html).toContain("events-hero-panel");
    expect(html).toContain("37");
    expect(html).toContain("1,284");
    expect(html).toContain("18");
    expect(html).toContain('href="/feed.xml"');
  });

  it("keeps a machine-readable stamp next to the relative time", () => {
    const html = render(hero());
    expect(html).toContain("site.hero.updated.minutes(6)");
    expect(html).toContain('datetime="2026-08-19T11:54:00.000Z"');
  });

  it("drops the panel but keeps the copy when the site has no events yet", () => {
    const html = render(hero({ live_events: 0 }));
    expect(html).not.toContain("events-hero-panel");
    expect(html).not.toContain("has-panel");
    expect(html).toContain("events-hero-headline");
  });

  it("drops the panel when the tenant turns counts off", () => {
    expect(render(hero(), { show_stats: false })).not.toContain(
      "events-hero-panel",
    );
  });

  it("still renders while the context provider has not answered", () => {
    const html = renderEventsHeroHtml(section(), {});
    expect(html).toContain("events-hero-headline");
    expect(html).not.toContain("events-hero-panel");
  });

  it("escapes tenant copy", () => {
    const html = render(hero(), { headline: "<script>alert(1)</script>" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("falls back to the current-topic feed template when href is missing", () => {
    const html = render(hero(), { secondary_href: "" });
    expect(html).toContain('href="/feed.xml"');
  });
});

describe("toPublicHero", () => {
  it("returns null when nothing is live — a hero of zeros is worse than no hero", () => {
    expect(hero({ live_events: 0 })).toBeNull();
  });

  it("keeps a zero row that is genuinely zero", () => {
    const view = hero({ merged_reports: 0 });
    expect(view?.stats.find((stat) => stat.key === "merged")?.value).toBe("0");
  });

  it("buckets the relative time by minute, hour and day", () => {
    const at = (iso: string) =>
      hero({ updated_at: iso })?.stats.find((stat) => stat.key === "updated")
        ?.value;
    expect(at("2026-08-19T11:59:30.000Z")).toBe("site.hero.updated.now");
    expect(at("2026-08-19T09:00:00.000Z")).toBe("site.hero.updated.hours(3)");
    expect(at("2026-08-17T12:00:00.000Z")).toBe("site.hero.updated.days(2)");
  });

  it("never shows a negative age when the ingest clock runs ahead", () => {
    expect(
      hero({ updated_at: "2026-08-19T12:05:00.000Z" })?.stats.find(
        (stat) => stat.key === "updated",
      )?.value,
    ).toBe("site.hero.updated.now");
  });

  it("omits the update row when the site has no activity stamp", () => {
    const view = hero({ updated_at: null });
    expect(view?.stats.map((stat) => stat.key)).toEqual([
      "live",
      "merged",
      "sources",
    ]);
  });
});

describe("renderEventsHeroHtml · 专题页", () => {
  it("fills {topic} from this page's own copy — not a topic_* override on the hub", () => {
    const html = render(
      hero(),
      {
        eyebrow: "事件雷达 · {topic}",
        headline: "{topic} 正在发生什么",
        secondary_label: "订阅 {topic}",
      },
      AI,
    );
    expect(html).toContain(
      '<h1 class="events-hero-headline">AI 正在发生什么</h1>',
    );
    expect(html).toContain("事件雷达 · AI");
    expect(html).toContain("订阅 AI");
    expect(html).not.toContain("同一件事，来自多个来源");
  });

  it("points the subscribe button at that topic's feed via {feed}", () => {
    const html = render(hero(), {}, AI);
    expect(html).toContain('href="/topics/ai/feed.xml"');
    expect(html).toContain('href="/about"');
  });

  it("respects a stored href — subscribe is a real link picker", () => {
    const html = render(
      hero(),
      { secondary_href: "https://elsewhere.example/events/feed.xml" },
      AI,
    );
    expect(html).toContain("elsewhere.example");
    expect(html).not.toContain("/topics/ai/feed.xml");
  });

  it("keeps the topic copy even when the panel is empty", () => {
    const html = render(null, { headline: "{topic} 正在发生什么" }, AI);
    expect(html).toContain("AI 正在发生什么");
    expect(html).not.toContain("events-hero-panel");
  });

  it("leaves the site page untouched — no placeholder leaks onto /", () => {
    const html = render(hero());
    expect(html).toContain("同一件事，来自多个来源，合成一条时间线");
    expect(html).not.toContain("{topic}");
    expect(html).toContain('href="/feed.xml"');
  });
});

describe("renderEventsHeroHtml · 实体页", () => {
  const openai = {
    entity: {
      slug: "openai-abc123",
      href: "/entities/openai-abc123",
      feed_href: "/entities/openai-abc123/feed.xml",
      name: "OpenAI",
      kind_label: "公司",
      event_count: 2,
      profile: [],
      events: [],
    },
  } as const;

  function renderEntity(
    extra: Record<string, unknown> = {},
    entity: (typeof openai)["entity"] | Record<string, unknown> = openai.entity,
  ): string {
    return renderEventsHeroHtml(section(extra), {
      contributed: eventsContextEntry(
        emptyEventsContext({ entity: entity as (typeof openai)["entity"] }),
      ),
    });
  }

  it("fills {entity} / {entity_kind} from this page's own copy", () => {
    const html = renderEntity({
      eyebrow: "事件雷达 · {entity_kind}",
      headline: "与 {entity} 相关的全部事件",
      show_stats: false,
    });
    expect(html).toContain(
      '<h1 class="events-hero-headline">与 OpenAI 相关的全部事件</h1>',
    );
    expect(html).toContain("事件雷达 · 公司");
    expect(html).not.toContain("同一件事，来自多个来源");
    expect(html).not.toContain("events-hero-panel");
  });

  it("points the subscribe button at that entity's feed via {feed}", () => {
    expect(renderEntity()).toContain('href="/entities/openai-abc123/feed.xml"');
  });

  /*
   * 累计档案画在这一段（不是正文段）：名字下面紧跟着事实，才是一张实体名片。
   * 排在 lead 之前——事实不该被一句库存文案挡在下一屏。
   */
  it("draws the running tally right under the headline", () => {
    const html = renderEntity(
      { headline: "{entity}", subhead: "lead", show_profile: true },
      { ...openai.entity, profile: ["近 90 天 12 件事", "故障 3 次"] },
    );
    expect(html).toContain("events-hero-profile");
    expect(html).toContain("近 90 天 12 件事");
    expect(html.indexOf("events-hero-profile")).toBeLessThan(
      html.indexOf("events-hero-lead"),
    );
  });

  it("escapes the tally so data can't smuggle markup out", () => {
    const html = renderEntity(
      { show_profile: true },
      { ...openai.entity, profile: ["<b>3</b> 次"] },
    );
    expect(html).not.toContain("<b>");
  });

  /* 窗口内不足两件事时 service 给空数组 → 整块不画，而不是一个空 ul。 */
  it("draws nothing when there is no tally yet", () => {
    expect(renderEntity({ show_profile: true })).not.toContain(
      "events-hero-profile",
    );
  });

  /* 首页 / 专题那一段根本没有这个 key，`settingBool` 缺键即 false。 */
  it("stays off wherever the setting is absent", () => {
    expect(
      renderEntity({}, { ...openai.entity, profile: ["近 90 天 12 件事"] }),
    ).not.toContain("events-hero-profile");
  });
});

describe("toPublicHero · 专题页", () => {
  it("reads the third row as contributing sources so all four rows share one scope", () => {
    const site = hero()!.stats.map((stat) => stat.key);
    const topic = hero({ topic_scoped: true })!.stats.map((stat) => stat.key);
    expect(site).toContain("sources");
    expect(topic).toContain("contributors");
    expect(topic).not.toContain("sources");
  });
});

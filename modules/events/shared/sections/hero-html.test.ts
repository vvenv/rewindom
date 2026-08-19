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
      primary_label: "订阅 RSS",
      primary_href: "/events/feed.xml",
      ...extra,
    },
  } as SiteSection;
}

function render(
  view: PublicHeroView | null,
  extra: Record<string, unknown> = {},
) {
  return renderEventsHeroHtml(section(extra), {
    contributed: eventsContextEntry(emptyEventsContext({ hero: view })),
  });
}

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
    // 千位分隔：1284 读作 1,284
    expect(html).toContain("1,284");
    expect(html).toContain("18");
    expect(html).toContain('href="/events/feed.xml"');
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
    const html = render(hero(), { headline: '<script>alert(1)</script>' });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
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
      hero({ updated_at: iso })?.stats.find(
        (stat) => stat.key === "updated",
      )?.value;
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

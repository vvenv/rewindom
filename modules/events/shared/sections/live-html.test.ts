import { describe, expect, it } from "vitest";

import {
  emptyEventsContext,
  eventsContextEntry,
} from "../events-section-context.js";
import { eventsLiveSection } from "../events-live-section.js";
import { toPublicHero } from "../public-view.js";
import { renderEventsLiveHtml } from "./live-html.js";

import { registerSectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

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

registerSectionDefinition(eventsLiveSection);

/** 这一段一个 setting 都不读，夹具只要类型对得上。 */
const section = {
  id: "s-live",
  type: eventsLiveSection.type,
  blocks: [],
  settings: {},
} as SiteSection;

function render(view: PublicHeroView | null): string {
  return renderEventsLiveHtml(section, {
    contributed: eventsContextEntry(emptyEventsContext({ hero: view })),
  });
}

describe("renderEventsLiveHtml", () => {
  it("paints every live count", () => {
    const html = render(hero());
    expect(html).toContain("events-live");
    expect(html).toContain("37");
    expect(html).toContain("1,284");
    expect(html).toContain("18");
  });

  it("keeps a machine-readable stamp next to the relative time", () => {
    const html = render(hero());
    expect(html).toContain("site.relative.minutes(6)");
    expect(html).toContain('datetime="2026-08-19T11:54:00.000Z"');
  });

  /* 它没有数字也没有单位，夹在三个大数中间就是一行掉队的灰字（见 PublicHeroUpdated）。 */
  it("hangs the freshness stamp off the LIVE header, not the readings", () => {
    const html = render(hero());
    expect(html).toContain("events-live-updated");
    expect(html.indexOf("events-live-updated")).toBeLessThan(
      html.indexOf("events-live-stats"),
    );
  });

  /* `dl` 的语义要求 dt 在 dd 前面，读屏也该先听见行名——视觉顺序是 CSS 用 order 翻的。 */
  it("keeps dt before dd so the list stays a valid dl", () => {
    expect(render(hero())).toContain(
      '<dt>site.hero.stat.live</dt><dd><span class="events-live-value">37</span>',
    );
  });

  /* 首屏挂一串 0 比不挂更糟，与 entity_strip 空态同一条纪律。 */
  it("draws nothing when the site has no events yet", () => {
    expect(render(hero({ live_events: 0 }))).toBe("");
  });

  it("draws nothing while the context provider has not answered", () => {
    expect(renderEventsLiveHtml(section, {})).toBe("");
  });

  /* 数据是系统查出来的，可行名与单位仍是文案——不转义就等于给它们一条出口。 */
  it("escapes the labels the service hands over", () => {
    const view = hero()!;
    const html = render({
      ...view,
      live_label: "<script>alert(1)</script>",
    });
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
    const at = (iso: string) => hero({ updated_at: iso })?.updated?.value;
    expect(at("2026-08-19T11:59:30.000Z")).toBe("site.relative.now");
    expect(at("2026-08-19T09:00:00.000Z")).toBe("site.relative.hours(3)");
    expect(at("2026-08-17T12:00:00.000Z")).toBe("site.relative.days(2)");
  });

  it("never shows a negative age when the ingest clock runs ahead", () => {
    expect(
      hero({ updated_at: "2026-08-19T12:05:00.000Z" })?.updated?.value,
    ).toBe("site.relative.now");
  });

  it("omits the stamp when the site has no activity — the readings stay", () => {
    const view = hero({ updated_at: null });
    expect(view?.updated).toBeNull();
    expect(view?.stats.map((stat) => stat.key)).toEqual([
      "live",
      "merged",
      "sources",
    ]);
  });
});

describe("toPublicHero · 专题页", () => {
  it("reads the third row as contributing sources so all three rows share one scope", () => {
    const site = hero()!.stats.map((stat) => stat.key);
    const topic = hero({ topic_scoped: true })!.stats.map((stat) => stat.key);
    expect(site).toContain("sources");
    expect(topic).toContain("contributors");
    expect(topic).not.toContain("sources");
  });
});

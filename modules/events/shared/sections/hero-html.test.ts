import { describe, expect, it } from "vitest";

import {
  emptyEventsContext,
  eventsContextEntry,
} from "../events-section-context.js";
import {
  EVENTS_HERO_SECTION_TYPE,
  eventsHeroSection,
} from "../events-hero-section.js";
import { toPublicHero } from "../public-view.js";
import { renderEventsHeroHtml } from "./hero-html.js";

import { interpolateSectionSettings } from "@rewindom/builtin/marketing/shared/interpolate-section-settings.js";
import { registerSectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";
import { readContributedInterpolation } from "@rewindom/builtin/marketing/shared/site-interpolation.js";

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

/*
 * 段的 `{token}` 由聚合层（`renderSectionHtml`）在调用渲染器之前替掉，所以这里也得
 * 走同一步——直接把原始 settings 喂给渲染器，测的就不是租户实际会看到的那一份了。
 * `interpolateSectionSettings` 要按 schema 判断哪个字段是文案，因此先登记定义。
 */
registerSectionDefinition(eventsHeroSection);

function renderHero(
  section: SiteSection,
  contributed?: Record<string, unknown>,
): string {
  const interpolation = readContributedInterpolation(contributed);
  return renderEventsHeroHtml(
    interpolateSectionSettings(section, interpolation),
    {
      contributed,
      interpolation,
    },
  );
}

function section(extra: Record<string, unknown> = {}): SiteSection {
  return {
    id: "s-hero",
    type: EVENTS_HERO_SECTION_TYPE,
    // 存储层解析出来的段恒带 blocks（哪怕是空的）；夹具也照这个形状来
    blocks: [],
    settings: {
      eyebrow: "事件雷达 · 持续追踪",
      headline: "同一件事，来自多个来源，合成一条时间线",
      subhead: "不是热榜。",
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
  return renderHero(
    section(extra),
    eventsContextEntry(emptyEventsContext({ hero: view, ...(topic ?? {}) })),
  );
}

const AI = { topic: "ai" as const, topic_label: "AI" };

describe("renderEventsHeroHtml", () => {
  it("renders the headline as the page h1 — the home page had no h1 at all before", () => {
    const html = render(hero());
    expect(html).toContain(
      '<h1 class="events-hero-headline">同一件事，来自多个来源，合成一条时间线</h1>',
    );
  });

  it("paints the CTA", () => {
    const html = render(hero());
    expect(html).toContain('href="/feed.xml"');
  });

  /* 读数已经是自己的一段（events.live），首屏不该再画任何数字。 */
  it("no longer paints the live counts — that is events.live now", () => {
    const html = render(hero());
    expect(html).not.toContain("events-live");
    expect(html).not.toContain("1,284");
  });

  it("still renders while the context provider has not answered", () => {
    const html = renderHero(section());
    expect(html).toContain("events-hero-headline");
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
      icon_url: null,
      event_count: 2,
      profile: [],
      events: [],
    },
  } as const;

  function renderEntity(
    extra: Record<string, unknown> = {},
    entity: (typeof openai)["entity"] | Record<string, unknown> = openai.entity,
  ): string {
    return renderHero(
      section(extra),
      eventsContextEntry(
        emptyEventsContext({ entity: entity as (typeof openai)["entity"] }),
      ),
    );
  }

  it("fills {entity} / {entity_kind} from this page's own copy", () => {
    const html = renderEntity({
      eyebrow: "事件雷达 · {entity_kind}",
      headline: "与 {entity} 相关的全部事件",
    });
    expect(html).toContain(
      '<h1 class="events-hero-headline">与 OpenAI 相关的全部事件</h1>',
    );
    expect(html).toContain("事件雷达 · 公司");
    expect(html).not.toContain("同一件事，来自多个来源");
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

/*
 * 题图。
 *
 * 第一条是这一期最重要的一条：`image` 为空时 markup 必须与加这几个设置之前
 * **逐字节相同**——存量已发布的首页 / 专题页因此不需要任何回填或兜底。
 */
describe("renderEventsHeroHtml · 题图", () => {
  it("renders byte-identical markup when no image is picked", () => {
    const html = render(hero());
    expect(html).toContain('<div class="events-hero">');
    expect(html).not.toContain("events-hero-copy");
    expect(html).not.toContain("events-hero-media");
    expect(html).not.toContain("<img");
  });

  it("leaves the wrapper alone for a section that never had the settings", () => {
    // `settingText` 缺键即空串——旧草稿里根本没有 image 这个 key
    const html = renderHero(section());
    expect(html).toContain('<div class="events-hero">');
    expect(html).not.toContain("events-hero-split");
  });

  it("paints the media slot beside the copy by default", () => {
    const html = render(hero(), { image: "/site-assets/ai.png" });
    expect(html).toContain('class="events-hero events-hero-split"');
    expect(html).toContain('<div class="events-hero-copy">');
    expect(html).toContain('src="/site-assets/ai.png"');
    // 媒体位在文案之后：窄屏塌成单列时第一眼仍是那句主张
    expect(html.indexOf("events-hero-copy")).toBeLessThan(
      html.indexOf("events-hero-media"),
    );
  });

  it("moves the media to the left when asked", () => {
    const html = render(hero(), {
      image: "/site-assets/ai.png",
      media_side: "left",
    });
    expect(html).toContain("events-hero-media-left");
  });

  it("puts the image behind the copy in the full-bleed layout", () => {
    const html = render(hero(), {
      image: "/site-assets/ai.png",
      image_layout: "background",
    });
    expect(html).toContain('class="events-hero events-hero-bg"');
    expect(html).not.toContain("events-hero-split");
    // 背景是底，读顺序上先于文案
    expect(html.indexOf("events-hero-media")).toBeLessThan(
      html.indexOf("events-hero-copy"),
    );
  });

  it("never puts a media-side class on the full-bleed layout", () => {
    const html = render(hero(), {
      image: "/site-assets/ai.png",
      image_layout: "background",
      media_side: "left",
    });
    expect(html).not.toContain("events-hero-media-left");
  });

  it("escapes the image address and alt — both are tenant input", () => {
    const html = render(hero(), {
      image: '/a.png" onerror="alert(1)',
      image_alt: '<img src=x onerror="alert(1)">',
    });
    expect(html).not.toContain("onerror=\"alert(1)\"");
    expect(html).toContain("&quot;");
  });

  /* alt 留空是正常情况：无障碍文案的真源是媒体库 asset 上那一份。 */
  it("emits an empty alt rather than inventing one", () => {
    const html = render(hero(), { image: "/site-assets/ai.png" });
    expect(html).toContain('alt=""');
  });

  /* 首屏那张是 LCP 候选——与列表里的事件题图正相反，不能 lazy。 */
  it("marks the hero image high priority and never lazy", () => {
    const html = render(hero(), { image: "/site-assets/ai.png" });
    expect(html).toContain('fetchpriority="high"');
    expect(html).not.toContain('loading="lazy"');
  });
});

/*
 * 实体名片上的标志。
 *
 * 覆盖率刻意有限（只有一手来源的出版方实体拿得到），所以「没有时长什么样」
 * 与「有时长什么样」同样重要——绝大多数实体页走的是前者。
 */
describe("renderEventsHeroHtml · 实体标志", () => {
  const openai = {
    slug: "openai-abc123",
    href: "/entities/openai-abc123",
    feed_href: "/entities/openai-abc123/feed.xml",
    name: "OpenAI",
    kind_label: "公司",
    icon_url: null as string | null,
    event_count: 2,
    profile: [] as string[],
    events: [],
  };

  function renderWithEntity(
    entity: Partial<typeof openai>,
    extra: Record<string, unknown> = {},
  ): string {
    return renderHero(
      section(extra),
      eventsContextEntry(
        emptyEventsContext({
          entity: { ...openai, ...entity } as never,
        }),
      ),
    );
  }

  it("paints the logo ahead of the eyebrow", () => {
    const html = renderWithEntity({ icon_url: "/events/icons/openai.com" });
    expect(html).toContain('class="events-hero-logo"');
    expect(html).toContain('src="/events/icons/openai.com"');
    expect(html.indexOf("events-hero-logo")).toBeLessThan(
      html.indexOf("events-hero-eyebrow"),
    );
  });

  /* 名片上只有一张图，画个地球等于告诉读者「这个实体长这样」。 */
  it("draws nothing — not a globe — when the host can't be derived", () => {
    const html = renderWithEntity({ icon_url: null });
    expect(html).not.toContain("events-hero-logo");
    expect(html).not.toContain("events-source-icon-fallback");
  });

  /* 一张画不出来的标志比没有标志更像故障。 */
  it("removes the whole box when the icon fails to load", () => {
    const html = renderWithEntity({ icon_url: "/events/icons/openai.com" });
    expect(html).toContain('onerror="this.parentElement.remove()"');
  });

  /* 租户手填的题图是显式覆盖，两者不叠加。 */
  it("stands down when the tenant picked an image for this hero", () => {
    const html = renderWithEntity(
      { icon_url: "/events/icons/openai.com" },
      { image: "/site-assets/openai.png" },
    );
    expect(html).not.toContain("events-hero-logo");
    expect(html).toContain("/site-assets/openai.png");
  });

  /* 首页 / 专题没有当前实体——那两页永远不该出现这一格。 */
  it("never appears on a hero without a current entity", () => {
    expect(render(hero())).not.toContain("events-hero-logo");
  });

  it("escapes the icon address", () => {
    const html = renderWithEntity({ icon_url: '/x.png" onload="alert(1)' });
    expect(html).not.toContain('onload="alert(1)"');
  });
});

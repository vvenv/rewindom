import { describe, expect, it } from "vitest";

import { createSection } from "../shared/section-schema.js";

import { renderMarketingHtml, renderSitemapXml } from "./ssr-render.js";

import type {
  PublicMarketingPage,
  PublicMarketingSite,
} from "../shared/site-cms.js";

function site(overrides: Partial<PublicMarketingSite> = {}) {
  return {
    site_name: "Acme",
    tagline: "",
    logo_url: null,
    primary_color: null,
    theme_settings: {},
    default_locale: "zh-CN",
    locale: "zh-CN",
    available_locales: ["zh-CN", "en"],
    header: [createSection("header")],
    footer: [createSection("footer")],
    pages: [],
    ...overrides,
  } as PublicMarketingSite;
}

function page(overrides: Partial<PublicMarketingPage> = {}) {
  return {
    slug: "about",
    locale: "zh-CN",
    kind: "page",
    title: "关于",
    description: "",
    sections: [],
    settings: {},
    path: "/about",
    alternates: [
      { locale: "zh-CN", path: "/about" },
      { locale: "en", path: "/en/about" },
    ],
    updated_at: "2026-08-04T00:00:00.000Z",
    ...overrides,
  } as PublicMarketingPage;
}

const ORIGIN = "https://acme.example";

describe("renderMarketingHtml SEO", () => {
  it("declares the page's own language, not the site default", () => {
    const html = renderMarketingHtml({
      origin: ORIGIN,
      site: site({ locale: "en" }),
      page: page({ locale: "en" }),
    });
    expect(html).toContain('<html lang="en">');
  });

  it("points canonical at the localised URL", () => {
    const html = renderMarketingHtml({
      origin: ORIGIN,
      site: site({ locale: "en" }),
      page: page({ locale: "en" }),
    });
    expect(html).toContain(
      `<link rel="canonical" href="${ORIGIN}/en/about" />`,
    );
  });

  it("leaves the default language unprefixed", () => {
    const html = renderMarketingHtml({
      origin: ORIGIN,
      site: site(),
      page: page(),
    });
    expect(html).toContain(`<link rel="canonical" href="${ORIGIN}/about" />`);
  });

  it("emits reciprocal hreflang plus x-default", () => {
    const html = renderMarketingHtml({
      origin: ORIGIN,
      site: site(),
      page: page(),
    });
    expect(html).toContain(
      `<link rel="alternate" hreflang="zh-CN" href="${ORIGIN}/about" />`,
    );
    expect(html).toContain(
      `<link rel="alternate" hreflang="en" href="${ORIGIN}/en/about" />`,
    );
    // x-default 指主语言
    expect(html).toContain(
      `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/about" />`,
    );
  });

  it("omits hreflang for single-language pages", () => {
    // 只有一种语言时互指不成立，列出来反而会被整组忽略
    const html = renderMarketingHtml({
      origin: ORIGIN,
      site: site(),
      page: page({ alternates: [{ locale: "zh-CN", path: "/about" }] }),
    });
    expect(html).not.toContain("hreflang");
  });

  it("renders the language switcher from the site-level theme setting", () => {
    // 开关是站点级的（theme_settings），不再是页头 section 的一个 checkbox
    expect(
      renderMarketingHtml({ origin: ORIGIN, site: site(), page: page() }),
    ).not.toContain('class="locale-switcher"');

    const html = renderMarketingHtml({
      origin: ORIGIN,
      site: site({ theme_settings: { show_locale_switcher: true } }),
      page: page(),
    });
    expect(html).toContain('class="locale-switcher"');
    expect(html).toContain('class="locale-switcher-menu"');
    expect(html).toContain('aria-label="Language"');
    expect(html).toContain('href="/en/about"');
  });

  it("points the brand link at the current language's home", () => {
    const html = renderMarketingHtml({
      origin: ORIGIN,
      site: site({ locale: "en" }),
      page: page({ locale: "en" }),
    });
    expect(html).toContain('<a class="brand" href="/en">');
  });

  it("lists top-level pages in the header when show_site_nav is on", () => {
    const header = createSection("header");
    header.settings = { ...header.settings, show_site_nav: true };
    const html = renderMarketingHtml({
      origin: ORIGIN,
      site: site({
        header: [header],
        pages: [
          {
            slug: "docs",
            locale: "zh-CN",
            kind: "page",
            title: "文档",
            description: "",
            path: "/docs",
            settings: {},
          },
          {
            slug: "pricing",
            locale: "zh-CN",
            kind: "page",
            title: "定价",
            description: "",
            path: "/pricing",
            settings: {},
          },
        ],
      }),
      page: page({ path: "/docs", slug: "docs", title: "文档" }),
    });
    expect(html).toContain('href="/docs"');
    expect(html).toContain("文档");
    expect(html).toContain('href="/pricing"');
    expect(html).toContain('aria-current="page"');
  });

  it("hides auto site nav when show_site_nav is off", () => {
    const header = createSection("header");
    header.settings = { ...header.settings, show_site_nav: false };
    const html = renderMarketingHtml({
      origin: ORIGIN,
      site: site({
        header: [header],
        pages: [
          {
            slug: "docs",
            locale: "zh-CN",
            kind: "page",
            title: "文档",
            description: "",
            path: "/docs",
            settings: {},
          },
        ],
      }),
      page: page(),
    });
    expect(html).not.toContain(">文档</a>");
  });
});

describe("renderSitemapXml", () => {
  it("gives each language its own url with xhtml alternates", () => {
    const xml = renderSitemapXml(ORIGIN, [
      {
        path: "/about",
        updated_at: "2026-08-04T00:00:00.000Z",
        alternates: [
          { locale: "zh-CN", path: "/about" },
          { locale: "en", path: "/en/about" },
        ],
      },
      {
        path: "/en/about",
        updated_at: "2026-08-04T00:00:00.000Z",
        alternates: [
          { locale: "zh-CN", path: "/about" },
          { locale: "en", path: "/en/about" },
        ],
      },
    ]);
    expect(xml).toContain("xmlns:xhtml");
    expect(xml).toContain(`<loc>${ORIGIN}/about</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/en/about</loc>`);
    expect(xml).toContain(
      `<xhtml:link rel="alternate" hreflang="en" href="${ORIGIN}/en/about"/>`,
    );
    expect(xml).toContain("<lastmod>2026-08-04</lastmod>");
  });
});

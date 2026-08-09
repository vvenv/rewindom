import { describe, expect, it } from "vitest";

import {
  createSection,
  type SettingValue,
  type SiteSection,
} from "../shared/section-schema.js";

import { renderMarketingHtml, renderSitemapXml } from "./ssr-render.js";

import type {
  PublicMarketingPage,
  PublicMarketingSite,
} from "../shared/site-cms.js";

/** 页头 section + 若干覆盖设置（默认值仍由 schema 兜底）。 */
function headerWith(settings: Record<string, SettingValue>): SiteSection {
  const section = createSection("header");
  return { ...section, settings: { ...section.settings, ...settings } };
}

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

  it("derives button foreground from the theme primary color", () => {
    const html = renderMarketingHtml({
      origin: ORIGIN,
      site: site({
        theme_settings: { primary_color: "#facc15" },
      }),
      page: page(),
    });
    // 主题变量是运行时按租户拼的，仍是原样；语义 CSS 是构建期压过的
    expect(html).toContain("--accent: #facc15");
    expect(html).toContain("--accent-fg: #0a0a0a");
    expect(html).toContain("color:var(--accent-fg)");
  });

  it("inlines shared semantic marketing CSS without Tailwind", () => {
    const html = renderMarketingHtml({
      origin: ORIGIN,
      site: site(),
      page: page(),
    });
    expect(html).toContain(".btn{");
    expect(html).toContain(".sec-band");
    expect(html).not.toContain('@import "tailwindcss"');
  });

  it("只内联本页用到的段样式", () => {
    const html = renderMarketingHtml({
      origin: ORIGIN,
      site: site(),
      page: page({ sections: [createSection("hero")] }),
    });
    expect(html).toContain(".hero");
    // 页头页脚在每页上，它们的样式照发
    expect(html).toContain(".site-header");
    expect(html).toContain(".site-footer");
    // 这页没有定价 / 表单段
    expect(html).not.toContain(".plan{");
    expect(html).not.toContain(".form-grid");
  });

  it("下钻分栏段的列——列里的子段样式不能漏", () => {
    const group = createSection("group");
    const html = renderMarketingHtml({
      origin: ORIGIN,
      site: site(),
      page: page({
        sections: [
          {
            ...group,
            blocks: [
              {
                id: "col-1",
                type: "column",
                settings: {},
                sections: [createSection("pricing")],
              },
            ],
          },
        ],
      }),
    });
    expect(html).toContain(".plan{");
  });

  it("会员闸门下仍发正文段的样式——解锁是客户端塞 HTML，那时 CSS 早发完了", () => {
    const html = renderMarketingHtml({
      origin: ORIGIN,
      site: site(),
      page: page({ sections: [createSection("pricing")] }),
      memberGate: true,
    });
    expect(html).toContain("data-member-gate");
    expect(html).toContain(".plan{");
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

  it("renders the language switcher from the header setting", () => {
    // 开关回到页头 section，与站点导航 / 明暗 / 账户入口并排（默认关）
    expect(
      renderMarketingHtml({ origin: ORIGIN, site: site(), page: page() }),
    ).not.toContain('class="locale-switcher"');

    const html = renderMarketingHtml({
      origin: ORIGIN,
      site: site({ header: [headerWith({ show_locale_switcher: true })] }),
      page: page(),
    });
    expect(html).toContain('class="locale-switcher"');
    expect(html).toContain('class="locale-switcher-menu"');
    expect(html).toContain('aria-label="Language"');
    expect(html).toContain('href="/en/about"');
    // 点外部收起：内联脚本绑定同一枚 details
    expect(html).toContain("d.open=false");
  });

  it("points the brand link at the current language's home", () => {
    const html = renderMarketingHtml({
      origin: ORIGIN,
      site: site({ locale: "en" }),
      page: page({ locale: "en" }),
    });
    expect(html).toContain('<a class="brand" href="/en">');
  });

  it("lists top-level pages in the header via the default menu", () => {
    const header = createSection("header");
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

  it("hides site nav when the header items are empty", () => {
    const header = headerWith({ items: [] });
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

/*
 * 公开站交互靠 site-enhance（无 React）：SSR 注入 defer 脚本，不挂 #root / main.tsx。
 */
describe("renderMarketingHtml 接上 site-enhance", () => {
  it("注入 enhance 脚本，正文包在 marketing-site-root（无 #root）", () => {
    const html = renderMarketingHtml({
      origin: ORIGIN,
      site: site(),
      page: page(),
    });
    expect(html).toContain("/api/public/site-enhance.js?v=");
    expect(html).toContain('class="marketing-site-root"');
    expect(html).toContain('data-page-path="/about"');
    expect(html).toContain('class="site-stack"');
    expect(html).toContain('<main class="site-main"');
    expect(html).not.toContain('id="root"');
    expect(html).not.toContain("/src/main.tsx");
  });

  it("会员门控页给 main 打 data-member-gate", () => {
    const html = renderMarketingHtml({
      origin: ORIGIN,
      site: site(),
      page: page(),
      memberGate: true,
    });
    expect(html).toContain("data-member-gate");
    expect(html).toContain('data-path="/about"');
    expect(html).toContain("noindex");
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

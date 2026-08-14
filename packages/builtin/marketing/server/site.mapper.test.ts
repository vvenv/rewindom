import { beforeAll, describe, expect, it } from "vitest";

import { registerLocaleCatalog } from "@rewindom/shared";

import {
  registerPageTemplateKind,
  registerPageTemplatePreset,
} from "../shared/page-templates.js";

import { toPublicMarketingPage, toPublicMarketingSite } from "./site.mapper.js";

import type {
  MarketingPage as MarketingPageRecord,
  MarketingSite as MarketingSiteRecord,
} from "@rewindom/server-kernel/generated/prisma/client/client.js";

function siteRecord(
  overrides: Partial<MarketingSiteRecord> = {},
): MarketingSiteRecord {
  return {
    id: "site-1",
    tenant_id: "t-1",
    site_name: "Acme",
    tagline: "",
    theme_settings: {},
    default_locale: "zh-CN",
    nav_json: null,
    footer_json: null,
    published: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as MarketingSiteRecord;
}

function pageRecord(
  overrides: Partial<MarketingPageRecord> = {},
): MarketingPageRecord {
  const title = overrides.title ?? "关于";
  const description = overrides.description ?? "";
  const sections = overrides.sections ?? [];
  return {
    id: "p-1",
    tenant_id: "t-1",
    slug: "about",
    locale: "zh-CN",
    kind: "page",
    title,
    description,
    sections,
    title_draft: overrides.title_draft ?? title,
    description_draft: overrides.description_draft ?? description,
    sections_draft: overrides.sections_draft ?? sections,
    settings: {},
    status: "published",
    sort_order: 0,
    created_at: new Date(),
    updated_at: new Date("2026-08-04T00:00:00Z"),
    ...overrides,
  } as MarketingPageRecord;
}

describe("toPublicMarketingSite logo", () => {
  it("takes the logo from theme_settings", () => {
    const site = toPublicMarketingSite(
      siteRecord({ theme_settings: { logo_url: "https://cdn/x.svg" } }),
      [],
    );
    expect(site.logo_url).toBe("https://cdn/x.svg");
    // 两处渲染都读 theme_settings，顶层 logo_url 只是派生值
    expect(site.theme_settings.logo_url).toBe("https://cdn/x.svg");
  });

  it("stays null when the site has no logo", () => {
    // 没有第二处来源可回落——品牌资产是站点自己的
    const site = toPublicMarketingSite(siteRecord(), []);
    expect(site.logo_url).toBeNull();
    expect(site.theme_settings.logo_url).toBeNull();
  });
});

describe("toPublicMarketingSite locale", () => {
  const pages = [
    pageRecord({ id: "p-zh", locale: "zh-CN", title: "关于" }),
    pageRecord({ id: "p-en", locale: "en", title: "About" }),
    pageRecord({ id: "p-zh-2", slug: "pricing", locale: "zh-CN" }),
  ];

  it("keeps only the requested language in pages", () => {
    // 不过滤的话导航 / 同级菜单 / sitemap 会为同一个 slug 出现多条
    const site = toPublicMarketingSite(siteRecord(), pages, "en");
    expect(site.pages).toHaveLength(1);
    expect(site.pages[0]?.title).toBe("About");
    expect(site.locale).toBe("en");
  });

  it("defaults to the site default language", () => {
    const site = toPublicMarketingSite(siteRecord(), pages);
    expect(site.locale).toBe("zh-CN");
    expect(site.pages.map((p) => p.slug)).toEqual(["about", "pricing"]);
  });

  it("reports which languages actually have content", () => {
    expect(
      toPublicMarketingSite(siteRecord(), pages).available_locales,
    ).toEqual(["zh-CN", "en"]);
    // 默认语言恒在列，否则切换器会把无前缀的主入口漏掉
    expect(
      toPublicMarketingSite(siteRecord(), []).available_locales,
    ).toEqual(["zh-CN"]);
  });

  it("renders chrome text in the requested language", () => {
    const site = toPublicMarketingSite(
      siteRecord({
        nav_json: [
          {
            type: "header",
            settings: {},
            blocks: [
              {
                type: "chrome_button",
                settings: {
                  label: { __i18n: { "zh-CN": "登录", en: "Sign in" } },
                  href: "/login",
                },
              },
            ],
          },
        ],
      }),
      pages,
      "en",
    );
    const button = site.header[0]!.blocks.find(
      (block) => block.type === "chrome_button",
    );
    expect(button?.settings.label).toBe("Sign in");
  });

  it("falls back to the default language for untranslated chrome text", () => {
    const site = toPublicMarketingSite(
      siteRecord({
        nav_json: [
          {
            type: "header",
            settings: {},
            blocks: [
              {
                type: "chrome_button",
                settings: {
                  label: { __i18n: { "zh-CN": "登录" } },
                  href: "/login",
                },
              },
            ],
          },
        ],
      }),
      pages,
      "en",
    );
    const button = site.header[0]!.blocks.find(
      (block) => block.type === "chrome_button",
    );
    expect(button?.settings.label).toBe("登录");
  });

  it("projects site_name into the requested language", () => {
    const site = toPublicMarketingSite(
      siteRecord({
        site_name: { __i18n: { "zh-CN": "艾克米", en: "Acme" } },
      }),
      pages,
      "en",
    );
    expect(site.site_name).toBe("Acme");
  });

  it("projects tagline into the requested language", () => {
    const site = toPublicMarketingSite(
      siteRecord({
        tagline: { __i18n: { "zh-CN": "标语", en: "Tagline" } },
      }),
      pages,
      "en",
    );
    expect(site.tagline).toBe("Tagline");
  });
});

describe("toPublicMarketingPage alternates", () => {
  const pages = [
    pageRecord({ id: "p-zh", locale: "zh-CN" }),
    pageRecord({ id: "p-en", locale: "en" }),
    pageRecord({ id: "p-other", slug: "pricing", locale: "en" }),
  ];

  it("groups translations by (kind, slug) and prefixes each path", () => {
    const page = toPublicMarketingPage(pages[0]!, {
      siblings: pages,
      defaultLocale: "zh-CN",
    });
    expect(page.alternates).toEqual([
      { locale: "zh-CN", path: "/about" },
      { locale: "en", path: "/en/about" },
    ]);
  });

  it("lists only itself when nothing is translated", () => {
    const page = toPublicMarketingPage(pages[2]!, {
      siblings: pages,
      defaultLocale: "zh-CN",
    });
    expect(page.alternates).toEqual([{ locale: "en", path: "/en/pricing" }]);
  });

  it("localises section text and internal links", () => {
    const record = pageRecord({
      locale: "en",
      sections: [
        {
          type: "band",
          settings: {
            headline: { __i18n: { "zh-CN": "开始使用", en: "Get started" } },
            primary_href: "/pricing",
          },
          blocks: [],
        },
      ],
    });
    const page = toPublicMarketingPage(record, {
      siblings: [record],
      defaultLocale: "zh-CN",
    });
    expect(page.sections[0]?.settings.headline).toBe("Get started");
    expect(page.sections[0]?.settings.primary_href).toBe("/en/pricing");
  });

  it("leaves the path itself unprefixed", () => {
    // `path` 是逻辑路径：pageDepth / siblingPages 都按它判定，带前缀会多出一层
    const page = toPublicMarketingPage(pages[1]!, {
      siblings: pages,
      defaultLocale: "zh-CN",
    });
    expect(page.path).toBe("/about");
  });

  it("reads draft page content when draftContent is true", () => {
    const record = pageRecord({
      title: "Live",
      title_draft: "Draft title",
      sections: [{ type: "hero", settings: { headline: "Live" }, blocks: [] }],
      sections_draft: [
        { type: "hero", settings: { headline: "Draft" }, blocks: [] },
      ],
    });
    const live = toPublicMarketingPage(record, { defaultLocale: "zh-CN" });
    const draft = toPublicMarketingPage(record, {
      defaultLocale: "zh-CN",
      draftContent: true,
    });
    expect(live.title).toBe("Live");
    expect(live.sections[0]?.settings.headline).toBe("Live");
    expect(draft.title).toBe("Draft title");
    expect(draft.sections[0]?.settings.headline).toBe("Draft");
  });
});

describe("toPublicMarketingSite pages catalog", () => {
  beforeAll(() => {
    registerPageTemplateKind({
      kind: "docs_index",
      slug: "docs",
      path: "/docs",
      group: "x",
      label: "x",
      required_section: null,
    });
    registerPageTemplateKind({
      kind: "docs_article",
      slug: "docs-article",
      path: "/docs/:slug",
      group: "x",
      label: "x",
      required_section: null,
    });
    registerPageTemplateKind({
      kind: "nav_shop_index",
      slug: "shop",
      path: "/shop",
      group: "x",
      label: "x",
      required_section: null,
    });
    registerPageTemplateKind({
      kind: "nav_shop_product",
      slug: "shop-product",
      path: "/shop/:slug",
      group: "x",
      label: "x",
      required_section: null,
    });
  });

  it("keeps first-level index templates and ordinary pages", () => {
    const site = toPublicMarketingSite(siteRecord(), [
      pageRecord({ id: "home", kind: "home", slug: "home", title: "首页" }),
      pageRecord({ id: "about", kind: "page", slug: "about", title: "关于" }),
      pageRecord({
        id: "docs",
        kind: "docs_index",
        slug: "docs",
        title: "文档",
      }),
      pageRecord({
        id: "article",
        kind: "docs_article",
        slug: "docs-article",
        title: "文档详情",
      }),
      pageRecord({
        id: "shop",
        kind: "nav_shop_index",
        slug: "shop",
        title: "商店",
      }),
      pageRecord({
        id: "product",
        kind: "nav_shop_product",
        slug: "shop-product",
        title: "商品",
      }),
    ]);
    expect(site.pages.map((page) => page.path)).toEqual([
      "/about",
      "/docs",
      "/shop",
    ]);
  });

  it("orders catalog by sort_order then slug, not input order", () => {
    const site = toPublicMarketingSite(siteRecord(), [
      pageRecord({
        id: "shop",
        kind: "nav_shop_index",
        slug: "shop",
        title: "商店",
        sort_order: 0,
      }),
      pageRecord({
        id: "about",
        kind: "page",
        slug: "about",
        title: "关于",
        sort_order: 0,
      }),
      pageRecord({
        id: "pricing",
        kind: "page",
        slug: "pricing",
        title: "定价",
        sort_order: 1,
      }),
    ]);
    expect(site.pages.map((page) => page.path)).toEqual([
      "/about",
      "/shop",
      "/pricing",
    ]);
  });

  it("omits entitlement-gated catalog pages until the module is on", () => {
    registerPageTemplateKind({
      kind: "gated_shop_index",
      slug: "gated-shop",
      path: "/gated-shop",
      group: "x",
      label: "x",
      required_section: null,
      entitlement: "shop",
    });
    const pages = [
      pageRecord({ id: "about", kind: "page", slug: "about", title: "关于" }),
      pageRecord({
        id: "gated",
        kind: "gated_shop_index",
        slug: "gated-shop",
        title: "商店",
      }),
    ];
    expect(
      toPublicMarketingSite(siteRecord(), pages).pages.map((page) => page.path),
    ).toEqual(["/about"]);
    expect(
      toPublicMarketingSite(siteRecord(), pages, undefined, {
        enabledEntitlements: new Set(["shop"]),
      }).pages.map((page) => page.path),
    ).toEqual(["/about", "/gated-shop"]);
  });

  it("borrows first-level templates into another locale with preset titles", () => {
    registerPageTemplateKind({
      kind: "i18n_shop_index",
      slug: "i18n-shop",
      path: "/i18n-shop",
      group: "x",
      label: "x",
      required_section: null,
    });
    registerPageTemplatePreset("i18n_shop_index", {
      key: "i18n_shop_index",
      label: "x",
      kind: "i18n_shop_index",
      slug: "i18n-shop",
      titleKey: "mapper-shop:nav.title",
      descriptionKey: "mapper-shop:nav.sub",
      sections: [],
    });
    registerLocaleCatalog("mapper-shop", {
      "zh-CN": { nav: { title: "商店", sub: "在售" } },
      en: { nav: { title: "Shop", sub: "For sale" } },
    });

    const pages = [
      pageRecord({ id: "about", kind: "page", slug: "about", title: "关于" }),
      pageRecord({
        id: "shop",
        kind: "i18n_shop_index",
        slug: "i18n-shop",
        title: "商品",
        description: "在售商品",
      }),
    ];
    const en = toPublicMarketingSite(siteRecord(), pages, "en");
    expect(en.pages.map((page) => [page.path, page.title])).toEqual([
      ["/i18n-shop", "Shop"],
    ]);
    expect(en.pages[0]?.locale).toBe("en");
  });

  it("rewrites a stock shop title on the current-locale row", () => {
    registerPageTemplateKind({
      kind: "stock_nav_shop",
      slug: "stock-nav-shop",
      path: "/stock-nav-shop",
      group: "x",
      label: "x",
      required_section: null,
    });
    registerPageTemplatePreset("stock_nav_shop", {
      key: "stock_nav_shop",
      label: "x",
      kind: "stock_nav_shop",
      slug: "stock-nav-shop",
      titleKey: "shop:storefront.catalog.title",
      descriptionKey: "mapper-shop:nav.sub",
      sections: [],
    });
    registerLocaleCatalog("shop", {
      "zh-CN": { storefront: { catalog: { title: "商店" } } },
      en: { storefront: { catalog: { title: "Shop" } } },
    });

    const pages = [
      pageRecord({
        id: "shop-zh",
        kind: "stock_nav_shop",
        slug: "stock-nav-shop",
        title: "商品",
      }),
      pageRecord({
        id: "shop-en",
        kind: "stock_nav_shop",
        slug: "stock-nav-shop",
        locale: "en",
        title: "商品",
      }),
    ];
    expect(
      toPublicMarketingSite(siteRecord(), pages, "en").pages.map((page) => [
        page.path,
        page.title,
      ]),
    ).toEqual([["/stock-nav-shop", "Shop"]]);
    expect(
      toPublicMarketingSite(siteRecord(), pages).pages.map((page) => [
        page.path,
        page.title,
      ]),
    ).toEqual([["/stock-nav-shop", "商店"]]);
  });
});

import { describe, expect, it } from "vitest";

import {
  createSection,
  getSectionDefinition,
  parseSettingValues,
  type SiteSection,
} from "./section-schema.js";
import {
  canonicalizePageIdentity,
  chromeNeedsDocList,
  chromeShowsDocSearch,
  marketingPagePath,
  pageDepth,
  pageParentPath,
  parsePageSettings,
  resolvePageMenu,
  siblingPages,
  siteNavPages,
  type PublicSitePage,
} from "./site-cms.js";
import { blankNavItem } from "./site-nav.js";

describe("marketingPagePath", () => {
  it("maps home and nested page slugs", () => {
    expect(marketingPagePath("home", "home")).toBe("/");
    expect(marketingPagePath("page", "about")).toBe("/about");
    expect(marketingPagePath("page", "docs")).toBe("/docs");
    expect(marketingPagePath("page", "docs/guide")).toBe("/docs/guide");
  });
});

describe("canonicalizePageIdentity", () => {
  it("normalizes home and page identities", () => {
    expect(canonicalizePageIdentity("page", "about")).toEqual({
      kind: "page",
      slug: "about",
    });
    expect(canonicalizePageIdentity("home", "home")).toEqual({
      kind: "home",
      slug: "home",
    });
    expect(canonicalizePageIdentity("page", "/Docs/Guide/")).toEqual({
      kind: "page",
      slug: "docs/guide",
    });
  });
});

describe("page hierarchy", () => {
  const page = (path: string, title: string): PublicSitePage => ({
    slug: path.split("/").pop() || "home",
    locale: "zh-CN",
    kind: "page",
    title,
    description: "",
    path,
    settings: {},
  });
  const pages = [
    page("/", "Home"),
    page("/docs", "Docs"),
    page("/docs/quickstart", "Quickstart"),
    page("/docs/deploy", "Deploy"),
    page("/pricing", "Pricing"),
  ];

  it("resolves parent path and depth", () => {
    expect(pageParentPath("/docs/quickstart")).toBe("/docs");
    expect(pageParentPath("/docs/")).toBe("/");
    expect(pageParentPath("/about")).toBe("/");
    expect(pageParentPath("/")).toBe("/");
    expect([pageDepth("/"), pageDepth("/about"), pageDepth("/a/b")]).toEqual([
      0, 1, 2,
    ]);
  });

  it("lists siblings sharing a parent, with the parent page attached", () => {
    const nested = siblingPages(pages, "/docs/quickstart");
    expect(nested.parent?.path).toBe("/docs");
    expect(nested.items.map((p) => p.path)).toEqual([
      "/docs/quickstart",
      "/docs/deploy",
    ]);

    // 顶层页的兄弟是其它顶层页，父页面是首页——是否渲染菜单由调用方决定
    const top = siblingPages(pages, "/pricing");
    expect(top.parent?.path).toBe("/");
    expect(top.items.map((p) => p.path)).toEqual(["/docs", "/pricing"]);
  });

  it("resolvePageMenu children lists direct children of the current path", () => {
    const menu = resolvePageMenu(pages, "/docs", "children");
    expect(menu.title).toBe("Docs");
    expect(menu.title_path).toBe("/docs");
    expect(menu.items.map((p) => p.path)).toEqual([
      "/docs/quickstart",
      "/docs/deploy",
    ]);
  });

  it("resolvePageMenu siblings matches siblingPages", () => {
    const menu = resolvePageMenu(pages, "/docs/quickstart", "siblings");
    const siblings = siblingPages(pages, "/docs/quickstart");
    expect(menu.title).toBe(siblings.parent?.title ?? null);
    expect(menu.title_path).toBe(siblings.parent?.path ?? null);
    expect(menu.items).toEqual(siblings.items);
  });

  it("siteNavPages lists top-level pages excluding home", () => {
    expect(siteNavPages(pages).map((p) => p.path)).toEqual([
      "/docs",
      "/pricing",
    ]);
  });
});

describe("page settings", () => {
  it("accepts canvas colors and rejects non-objects", () => {
    expect(parsePageSettings({ page_nav: "right" })).toEqual({});
    expect(parsePageSettings(null)).toEqual({});
    expect(parsePageSettings({})).toEqual({});
    expect(
      parsePageSettings({ bg_color: "#0f766e80", fg_color: "#111" }),
    ).toEqual({ bg_color: "#0f766e80", fg_color: "#111" });
    expect(() => parsePageSettings({ bg_color: "red" })).toThrow(
      "site.page_settings_invalid",
    );
    expect(() => parsePageSettings([])).toThrow("site.page_settings_invalid");
    expect(() => parsePageSettings("x")).toThrow("site.page_settings_invalid");
  });
});

describe("文档模板页", () => {
  it("按显式 kind 认领固定 slug", () => {
    expect(canonicalizePageIdentity("doc_index", "随便写")).toEqual({
      kind: "doc_index",
      slug: "docs",
    });
    expect(canonicalizePageIdentity("doc_article", "")).toEqual({
      kind: "doc_article",
      slug: "docs-article",
    });
  });

  // `docs` 是保留 slug：想建一个叫 docs 的普通页应该被拒，而不是悄悄变成模板页
  it("不按 slug 反推 kind", () => {
    expect(canonicalizePageIdentity(undefined, "docs")).toEqual({
      kind: "page",
      slug: "docs",
    });
  });

  it("索引页有真实地址，详情页只有模板路径", () => {
    expect(marketingPagePath("doc_index", "docs")).toBe("/docs");
    expect(marketingPagePath("doc_article", "docs-article")).toBe(
      "/docs/:slug",
    );
  });
});

describe("chrome 的文档数据需求", () => {
  function header(settings: Record<string, unknown>): SiteSection {
    const section = createSection("header");
    return {
      ...section,
      settings: parseSettingValues(getSectionDefinition("header").settings, {
        ...section.settings,
        ...settings,
      }),
    };
  }

  const plain = {
    header: [header({ show_doc_search: false, items: [] })],
    footer: [],
  };

  it("什么都没用到文档时两档都不要", () => {
    expect(chromeNeedsDocList(plain)).toBe(false);
    expect(chromeShowsDocSearch(plain)).toBe(false);
  });

  it("页头默认导航只有一级页面，不要整份目录", () => {
    expect(chromeNeedsDocList({ header: [header({})], footer: [] })).toBe(
      false,
    );
  });

  it("导航条目挂了文档动态项要整份目录", () => {
    const item = blankNavItem("docs");
    expect(
      chromeNeedsDocList({
        ...plain,
        header: [header({ items: [item] })],
      }),
    ).toBe(true);
  });

  it("页脚摆了 doc-* 段要整份目录", () => {
    expect(
      chromeNeedsDocList({ ...plain, footer: [createSection("doc-nav")] }),
    ).toBe(true);
  });

  it("页头搜索只要「有没有文档」，不要整份目录", () => {
    const withSearch = { ...plain, header: [header({ show_doc_search: true, items: [] })] };
    expect(chromeShowsDocSearch(withSearch)).toBe(true);
    expect(chromeNeedsDocList(withSearch)).toBe(false);
  });
});

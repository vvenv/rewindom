import { describe, expect, it } from "vitest";

import {
  canonicalizePageIdentity,
  marketingPagePath,
  pageDepth,
  pageParentPath,
  parsePageSettings,
  resolvePageMenu,
  siblingPages,
  siteNavPages,
  type PublicSitePage,
} from "./site-cms.js";

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

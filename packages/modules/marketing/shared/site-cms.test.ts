import { describe, expect, it } from "vitest";

import {
  marketingPagePath,
  pageDepth,
  pageParentPath,
  parsePageSettings,
  resolvePageNav,
  siblingPages,
  type PublicSitePage,
} from "./site-cms.js";

describe("marketingPagePath", () => {
  it("maps home / doc index / doc / page", () => {
    expect(marketingPagePath("home", "home")).toBe("/");
    expect(marketingPagePath("doc", "index")).toBe("/docs");
    expect(marketingPagePath("doc", "guide")).toBe("/docs/guide");
    expect(marketingPagePath("page", "about")).toBe("/about");
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
});

describe("page settings", () => {
  it("parses page_nav and rejects unknown modes", () => {
    expect(parsePageSettings({ page_nav: "right" })).toEqual({
      page_nav: "right",
    });
    expect(parsePageSettings(null)).toEqual({});
    expect(() => parsePageSettings({ page_nav: "top" })).toThrow(
      "site.page_settings_invalid",
    );
    expect(() => parsePageSettings([])).toThrow("site.page_settings_invalid");
  });

  it("resolves page setting over the site default", () => {
    expect(resolvePageNav({ page_nav: "off" }, "left")).toBe("off");
    expect(resolvePageNav({ page_nav: "inherit" }, "right")).toBe("right");
    expect(resolvePageNav({}, "right")).toBe("right");
    expect(resolvePageNav(undefined, undefined)).toBe("left");
  });
});

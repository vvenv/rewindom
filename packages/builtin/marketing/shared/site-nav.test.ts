import { afterEach, describe, expect, it } from "vitest";

import { createSection } from "./section-schema.js";
import {
  defaultHeaderNavItems,
  listNavSources,
  makeNavLink,
  navItemsNeedSource,
  registerNavSource,
  resetNavSourceContributions,
  resolveNavItems,
  safeNavItems,
  type SiteNavContext,
  type SiteNavItem,
} from "./site-nav.js";

function item(partial: Partial<SiteNavItem> = {}): SiteNavItem {
  return {
    id: partial.id ?? "i1",
    source: partial.source ?? "link",
    label: partial.label ?? "",
    href: partial.href ?? "",
    category: partial.category ?? "",
    expand: partial.expand ?? "children",
    children: partial.children ?? [],
  };
}

const NAV_PAGES = [
  { path: "/about", title: "关于" },
  { path: "/pricing", title: "定价" },
];

function ctx(partial: Partial<SiteNavContext> = {}): SiteNavContext {
  return {
    navPages: NAV_PAGES,
    locale: "zh-CN",
    defaultLocale: "zh-CN",
    ...partial,
  };
}

afterEach(() => {
  resetNavSourceContributions();
});

describe("defaultHeaderNavItems", () => {
  it("默认只有一级页面平铺", () => {
    expect(
      defaultHeaderNavItems().map((entry) => [entry.source, entry.expand]),
    ).toEqual([["pages", "flat"]]);
  });

  it("展开出一级页面", () => {
    const resolved = resolveNavItems(defaultHeaderNavItems(), ctx());
    expect(resolved.map((entry) => entry.href)).toEqual(["/about", "/pricing"]);
  });

  it("非默认语言给一级页面补 locale 前缀", () => {
    const resolved = resolveNavItems(
      defaultHeaderNavItems(),
      ctx({
        locale: "en",
        navPages: [
          { path: "/about", title: "About" },
          { path: "/shop", title: "Shop" },
        ],
      }),
    );
    expect(resolved.map((entry) => entry.href)).toEqual([
      "/en/about",
      "/en/shop",
    ]);
  });
});

describe("resolveNavItems", () => {
  it("pages 平铺就地展开", () => {
    const resolved = resolveNavItems(
      [item({ source: "pages", expand: "flat" })],
      ctx(),
    );
    expect(resolved.map((entry) => entry.href)).toEqual(["/about", "/pricing"]);
  });

  it("空标签的 link 在编辑态保留、渲染时丢掉", () => {
    const draft = safeNavItems([item({ label: "", href: "/x", source: "link" })]);
    expect(draft).toHaveLength(1);
    expect(resolveNavItems(draft, ctx())).toEqual([]);
  });

  it("空 link 不渲染", () => {
    expect(
      resolveNavItems([item({ label: "有字", href: "" })], ctx()),
    ).toEqual([]);
  });

  it("未登记的贡献源整条消失", () => {
    expect(
      resolveNavItems([item({ source: "site-docs" })], ctx()),
    ).toEqual([]);
  });

  it("声明了 entitlement 的贡献源未开通就不展开", () => {
    registerNavSource({
      source: "nav-gated",
      label: "x",
      entitlement: "shop",
      expand: (entry, nav) => [
        makeNavLink(entry.id, "商店", "/shop", nav),
      ],
    });
    expect(
      resolveNavItems([item({ source: "nav-gated" })], ctx()),
    ).toEqual([]);
    expect(
      resolveNavItems([item({ source: "nav-gated" })], ctx({ enabledEntitlements: new Set() })),
    ).toEqual([]);
    expect(
      resolveNavItems(
        [item({ source: "nav-gated" })],
        ctx({ enabledEntitlements: new Set(["shop"]) }),
      ).map((entry) => entry.href),
    ).toEqual(["/shop"]);
    expect(
      resolveNavItems(
        [item({ source: "nav-gated" })],
        ctx({
          locale: "en",
          enabledEntitlements: new Set(["shop"]),
        }),
      ).map((entry) => entry.href),
    ).toEqual(["/en/shop"]);
  });

  it("自定义链接也跟当前语言走", () => {
    expect(
      resolveNavItems(
        [item({ label: "商店", href: "/shop" })],
        ctx({ locale: "en" }),
      ).map((entry) => entry.href),
    ).toEqual(["/en/shop"]);
  });
});

describe("listNavSources", () => {
  it("没给开通集合时不露出带 entitlement 的源", () => {
    registerNavSource({
      source: "nav-gated",
      label: "x",
      entitlement: "shop",
      expand: () => [],
    });
    expect(listNavSources()).not.toContain("nav-gated");
    expect(listNavSources(new Set())).not.toContain("nav-gated");
    expect(listNavSources(new Set(["shop"]))).toContain("nav-gated");
    expect(listNavSources(new Set(["shop"]))).toEqual(
      expect.arrayContaining(["link", "pages", "nav-gated"]),
    );
  });
});

describe("navItemsNeedSource", () => {
  it("只有 pages 时不匹配 site-docs", () => {
    expect(
      navItemsNeedSource(
        [item({ source: "pages", expand: "flat" })],
        "site-docs",
      ),
    ).toBe(false);
  });

  it("默认页头只有 pages", () => {
    expect(navItemsNeedSource(defaultHeaderNavItems(), "site-docs")).toBe(
      false,
    );
  });

  it("chrome 扫 header settings.items", () => {
    const header = createSection("header");
    expect(
      navItemsNeedSource(
        header.blocks.flatMap((block) =>
          Array.isArray(block.settings.items)
            ? (block.settings.items as SiteNavItem[])
            : [],
        ),
        "site-docs",
      ),
    ).toBe(false);

    const withDocs = createSection("header");
    withDocs.settings.items = [
      item({ source: "site-docs", expand: "children" }),
    ];
    expect(
      navItemsNeedSource(
        (withDocs.settings.items as SiteNavItem[]) ?? [],
        "site-docs",
      ),
    ).toBe(true);
  });
});

describe("safeNavItems", () => {
  it("非数组回落空", () => {
    expect(safeNavItems("x")).toEqual([]);
  });

  it("存量 docs 源解析时改写成 site-docs", () => {
    const parsed = safeNavItems([
      {
        id: "x",
        source: "docs",
        label: "",
        href: "",
        category: "",
        expand: "children",
        children: [],
      },
    ]);
    expect(parsed[0]?.source).toBe("site-docs");
  });
});

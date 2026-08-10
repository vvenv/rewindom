import { describe, expect, it } from "vitest";

import { createSection } from "./section-schema.js";
import { chromeNeedsDocList, chromeShowsDocSearch } from "./site-cms.js";
import {
  defaultHeaderNavItems,
  navItemsNeedDocs,
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

const DOCS = [
  {
    slug: "intro",
    title: "介绍",
    description: "",
    category: "入门",
    category_label: "入门",
    sort_order: 0,
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    slug: "install",
    title: "安装",
    description: "",
    category: "入门",
    category_label: "入门",
    sort_order: 1,
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

function ctx(partial: Partial<SiteNavContext> = {}): SiteNavContext {
  return {
    navPages: NAV_PAGES,
    docs: DOCS,
    locale: "zh-CN",
    defaultLocale: "zh-CN",
    ...partial,
  };
}

describe("defaultHeaderNavItems", () => {
  it("默认是一级页面平铺 + 文档库下拉", () => {
    expect(
      defaultHeaderNavItems().map((entry) => [entry.source, entry.expand]),
    ).toEqual([
      ["pages", "flat"],
      ["docs", "children"],
    ]);
  });

  it("有文档时展开出页面与文档父项；库空时文档那条消失", () => {
    const withDocs = resolveNavItems(defaultHeaderNavItems(), ctx());
    expect(withDocs.map((entry) => entry.href)).toEqual([
      "/about",
      "/pricing",
      "/docs",
    ]);
    const empty = resolveNavItems(defaultHeaderNavItems(), ctx({ docs: [] }));
    expect(empty.map((entry) => entry.href)).toEqual(["/about", "/pricing"]);
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

  it("docs 库空整条消失", () => {
    expect(
      resolveNavItems([item({ source: "docs" })], ctx({ docs: [] })),
    ).toEqual([]);
  });
});

describe("navItemsNeedDocs / chromeNeedsDocList", () => {
  it("只有 pages 时不需要文档", () => {
    expect(navItemsNeedDocs([item({ source: "pages", expand: "flat" })])).toBe(
      false,
    );
  });

  it("默认页头含 docs，需要文档", () => {
    expect(navItemsNeedDocs(defaultHeaderNavItems())).toBe(true);
  });

  it("chrome 扫 header settings.items", () => {
    const header = createSection("header");
    expect(
      chromeNeedsDocList({ header: [header], footer: [] }),
    ).toBe(true);

    const plain = createSection("header");
    plain.settings.items = [item({ source: "pages", expand: "flat" })];
    expect(chromeNeedsDocList({ header: [plain], footer: [] })).toBe(false);
  });

  it("页头搜索默认开", () => {
    expect(chromeShowsDocSearch({ header: [createSection("header")] })).toBe(
      true,
    );
  });
});

describe("safeNavItems", () => {
  it("非数组回落空", () => {
    expect(safeNavItems("x")).toEqual([]);
  });
});

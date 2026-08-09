import { describe, expect, it } from "vitest";

import { groupSitePages } from "./site-page-groups.js";
import {
  canMoveSitePageGroup,
  moveSitePageGroup,
  summarizeSitePages,
} from "./site-page-order.js";

import type { MarketingPageListItem } from "../../shared/site-cms.js";

function page(
  partial: Partial<MarketingPageListItem> &
    Pick<MarketingPageListItem, "id" | "slug">,
): MarketingPageListItem {
  return {
    locale: "zh-CN",
    kind: "page",
    title: partial.slug,
    description: "",
    settings: {},
    visibility: "public",
    status: "draft",
    content_dirty: false,
    sort_order: 0,
    updated_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function groupsOf(pages: MarketingPageListItem[]) {
  return groupSitePages(pages, "zh-CN");
}

describe("moveSitePageGroup", () => {
  it("renumbers from zero so a legacy all-zero list actually moves", () => {
    // 存量页面的 sort_order 全是 0：换值等于没换，必须重编号
    const groups = groupsOf([
      page({ id: "a", slug: "about" }),
      page({ id: "b", slug: "pricing" }),
      page({ id: "c", slug: "contact" }),
    ]);

    expect(moveSitePageGroup(groups, 2, -1)).toEqual([
      { id: "c", sort_order: 1 },
      { id: "b", sort_order: 2 },
    ]);
  });

  it("keeps a translation group on one position", () => {
    const groups = groupsOf([
      page({ id: "zh", slug: "about", sort_order: 0 }),
      page({ id: "en", slug: "about", locale: "en", sort_order: 0 }),
      page({ id: "p", slug: "pricing", sort_order: 1 }),
    ]);

    // 一个逻辑 URL 在导航里只占一个位置，各语言拿同一个 sort_order
    expect(moveSitePageGroup(groups, 0, 1)).toEqual([
      { id: "p", sort_order: 0 },
      { id: "zh", sort_order: 1 },
      { id: "en", sort_order: 1 },
    ]);
  });

  it("writes nothing when the move runs off either end", () => {
    const groups = groupsOf([
      page({ id: "a", slug: "about" }),
      page({ id: "b", slug: "pricing" }),
    ]);

    expect(moveSitePageGroup(groups, 0, -1)).toEqual([]);
    expect(moveSitePageGroup(groups, 1, 1)).toEqual([]);
  });

  it("only writes the pages whose sort_order really changed", () => {
    const groups = groupsOf([
      page({ id: "a", slug: "about", sort_order: 0 }),
      page({ id: "b", slug: "pricing", sort_order: 1 }),
      page({ id: "c", slug: "contact", sort_order: 2 }),
    ]);

    expect(moveSitePageGroup(groups, 0, 1)).toEqual([
      { id: "b", sort_order: 0 },
      { id: "a", sort_order: 1 },
    ]);
  });
});

describe("canMoveSitePageGroup", () => {
  it("stops at both ends and on a single-group list", () => {
    const two = groupsOf([
      page({ id: "a", slug: "about" }),
      page({ id: "b", slug: "pricing" }),
    ]);
    expect(canMoveSitePageGroup(two, 0, -1)).toBe(false);
    expect(canMoveSitePageGroup(two, 0, 1)).toBe(true);
    expect(canMoveSitePageGroup(two, 1, 1)).toBe(false);

    const one = groupsOf([page({ id: "a", slug: "about" })]);
    expect(canMoveSitePageGroup(one, 0, 1)).toBe(false);
  });
});

describe("summarizeSitePages", () => {
  it("counts pages, published and dirty — doc layouts excluded", () => {
    const summary = summarizeSitePages([
      page({ id: "a", slug: "about", status: "published" }),
      page({
        id: "b",
        slug: "pricing",
        status: "published",
        content_dirty: true,
      }),
      page({ id: "c", slug: "contact" }),
      // 文档版式默认不落库，算进来会让计数随「有没有自定义过」跳动
      page({ id: "d", slug: "docs", kind: "doc_index", status: "published" }),
    ]);

    expect(summary).toEqual({ total: 3, published: 2, dirty: 1 });
  });

  it("ignores content_dirty on pages that were never published", () => {
    const summary = summarizeSitePages([
      page({ id: "a", slug: "about", content_dirty: true }),
    ]);

    expect(summary).toEqual({ total: 1, published: 0, dirty: 0 });
  });
});

import { describe, expect, it } from "vitest";

import {
  collectSitePageLocales,
  filterSitePageGroups,
} from "./site-page-list.js";
import { groupSitePages } from "./site-page-groups.js";

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

const pages = [
  page({ id: "zh", slug: "about", title: "关于我们", status: "published" }),
  page({ id: "en", slug: "about", title: "About us", locale: "en" }),
  page({
    id: "p",
    slug: "pricing",
    title: "定价",
    status: "published",
    content_dirty: true,
  }),
];

const groups = groupSitePages(pages, "zh-CN");

describe("filterSitePageGroups", () => {
  it("keeps a group but drops the language rows that miss the filter", () => {
    const [group, ...rest] = filterSitePageGroups(groups, { status: "draft" });

    // 「找还没发的东西」= 组还在，只留草稿那一行
    expect(rest).toHaveLength(0);
    expect(group!.slug).toBe("about");
    expect(group!.pages.map((p) => p.id)).toEqual(["en"]);
  });

  it("treats dirty as published-with-unpublished-changes", () => {
    const filtered = filterSitePageGroups(groups, { status: "dirty" });
    expect(filtered.map((group) => group.slug)).toEqual(["pricing"]);
  });

  it("matches the query against path and per-locale title", () => {
    expect(
      filterSitePageGroups(groups, { q: "/about" }).map((g) => g.slug),
    ).toEqual(["about"]);
    // 组头显示的是主语言标题，搜英文译文一样要能搜到
    const [group] = filterSitePageGroups(groups, { q: "about us" });
    expect(group?.pages.map((p) => p.id)).toEqual(["en"]);
  });

  it("keeps the stored order rather than reordering by relevance", () => {
    expect(filterSitePageGroups(groups, {}).map((g) => g.slug)).toEqual([
      "about",
      "pricing",
    ]);
  });

  it("filters by locale", () => {
    const filtered = filterSitePageGroups(groups, { locale: "en" });
    expect(filtered.map((group) => group.slug)).toEqual(["about"]);
  });
});

describe("collectSitePageLocales", () => {
  it("returns the locales in APP_LOCALES order, deduped", () => {
    expect(collectSitePageLocales(pages)).toEqual(["zh-CN", "en"]);
  });
});

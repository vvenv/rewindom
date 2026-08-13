import { describe, expect, it } from "vitest";

import {
  collectDocCategories,
  collectDocLocales,
  filterSiteDocs,
  hasActiveDocFilters,
  isSiteDocStatusFilter,
  paginateSiteDocs,
  slugifyDocTitle,
  sortSiteDocs,
} from "./site-doc-list.js";

import type { SiteDocListItem } from "../../shared/site-doc.js";

function doc(
  partial: Partial<SiteDocListItem> &
    Pick<SiteDocListItem, "id" | "slug" | "title">,
): SiteDocListItem {
  return {
    locale: "zh-CN",
    description: "",
    category: "",
    category_label: "",
    status: "draft",
    content_dirty: false,
    sort_order: 0,
    updated_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

const docs: SiteDocListItem[] = [
  doc({
    id: "1",
    slug: "quickstart",
    title: "快速开始",
    description: "十分钟跑通",
    category: "入门",
    status: "published",
  }),
  doc({
    id: "2",
    slug: "install",
    title: "安装",
    category: "入门",
    status: "published",
    content_dirty: true,
  }),
  doc({ id: "3", slug: "faq", title: "FAQ" }),
];

describe("collectDocCategories", () => {
  it("dedupes and drops the empty category", () => {
    expect(collectDocCategories(docs)).toEqual(["入门"]);
  });

  it("sorts categories so chip order is stable across refetches", () => {
    const sorted = collectDocCategories([
      doc({ id: "a", slug: "a", title: "A", category: "guides" }),
      doc({ id: "b", slug: "b", title: "B", category: "api" }),
    ]);
    expect(sorted).toEqual(["api", "guides"]);
  });
});

describe("collectDocLocales", () => {
  it("单语言库只报一种——调用方据此不画语言列与筛选", () => {
    expect(collectDocLocales(docs)).toEqual(["zh-CN"]);
  });

  it("按 APP_LOCALES 的顺序报，不随文档顺序抖动", () => {
    const mixed = [
      doc({ id: "e", slug: "faq", title: "FAQ", locale: "en" }),
      doc({ id: "z", slug: "faq", title: "常见问题", locale: "zh-CN" }),
    ];
    expect(collectDocLocales(mixed)).toEqual(["zh-CN", "en"]);
  });
});

describe("filterSiteDocs", () => {
  it("returns everything when no filter is set", () => {
    expect(filterSiteDocs(docs, {})).toHaveLength(3);
  });

  it("searches title, slug, description and category", () => {
    expect(filterSiteDocs(docs, { q: "十分钟" }).map((d) => d.id)).toEqual([
      "1",
    ]);
    expect(filterSiteDocs(docs, { q: "INSTALL" }).map((d) => d.id)).toEqual([
      "2",
    ]);
    expect(filterSiteDocs(docs, { q: "入门" }).map((d) => d.id)).toEqual([
      "1",
      "2",
    ]);
  });

  it("filters by exact category", () => {
    expect(filterSiteDocs(docs, { category: "入门" })).toHaveLength(2);
    expect(filterSiteDocs(docs, { category: "指南" })).toHaveLength(0);
  });

  it("按语言筛——同 slug 的译文各是一行，只靠标题分不出来", () => {
    const mixed = [
      ...docs,
      doc({ id: "4", slug: "faq", title: "FAQ", locale: "en" }),
    ];
    expect(filterSiteDocs(mixed, { locale: "en" }).map((d) => d.id)).toEqual([
      "4",
    ]);
    expect(filterSiteDocs(mixed, { locale: "zh-CN" })).toHaveLength(3);
  });

  it("treats `dirty` as its own status filter, not a doc status", () => {
    expect(
      filterSiteDocs(docs, { status: "published" }).map((d) => d.id),
    ).toEqual(["1", "2"]);
    expect(filterSiteDocs(docs, { status: "draft" }).map((d) => d.id)).toEqual([
      "3",
    ]);
    expect(filterSiteDocs(docs, { status: "dirty" }).map((d) => d.id)).toEqual([
      "2",
    ]);
  });

  it("ignores an unknown status value instead of emptying the table", () => {
    expect(filterSiteDocs(docs, { status: "bogus" })).toHaveLength(3);
  });

  it("combines filters", () => {
    expect(
      filterSiteDocs(docs, { q: "安装", category: "入门", status: "dirty" }),
    ).toHaveLength(1);
  });
});

describe("sortSiteDocs", () => {
  it("sorts by title ascending / descending", () => {
    const sortedAsc = sortSiteDocs(docs, "title", "asc").map((d) => d.id);
    expect(sortedAsc).toEqual(["3", "2", "1"]);
    const sortedDesc = sortSiteDocs(docs, "title", "desc").map((d) => d.id);
    expect(sortedDesc).toEqual(["1", "2", "3"]);
  });

  it("ignores unknown sort fields", () => {
    expect(sortSiteDocs(docs, "nope", "asc").map((d) => d.id)).toEqual([
      "1",
      "2",
      "3",
    ]);
  });
});

describe("paginateSiteDocs", () => {
  it("slices by page and clamps an out-of-range page", () => {
    const page1 = paginateSiteDocs(docs, 1, 2);
    expect(page1.items.map((d) => d.id)).toEqual(["1", "2"]);
    expect(page1.page_count).toBe(2);

    const clamped = paginateSiteDocs(docs, 99, 2);
    expect(clamped.page).toBe(2);
    expect(clamped.items.map((d) => d.id)).toEqual(["3"]);
  });
});

describe("hasActiveDocFilters", () => {
  it("is false only when every filter is empty", () => {
    expect(hasActiveDocFilters({})).toBe(false);
    expect(hasActiveDocFilters({ q: "" })).toBe(false);
    expect(hasActiveDocFilters({ q: "x" })).toBe(true);
    expect(hasActiveDocFilters({ status: "draft" })).toBe(true);
  });
});

describe("isSiteDocStatusFilter", () => {
  it("accepts only the known filter values", () => {
    expect(isSiteDocStatusFilter("dirty")).toBe(true);
    expect(isSiteDocStatusFilter("archived")).toBe(false);
    expect(isSiteDocStatusFilter(undefined)).toBe(false);
  });
});

describe("slugifyDocTitle", () => {
  it("derives a valid single-segment slug", () => {
    expect(slugifyDocTitle("Getting Started")).toBe("getting-started");
    expect(slugifyDocTitle("  Install & Setup!  ")).toBe("install-setup");
  });

  it("never leaves a leading or trailing hyphen", () => {
    expect(slugifyDocTitle("--edge--")).toBe("edge");
    expect(slugifyDocTitle("v2.0 ")).toBe("v2-0");
  });

  it("caps at 63 chars without ending on a hyphen", () => {
    const slug = slugifyDocTitle(`${"a".repeat(62)} b`);
    expect(slug).toHaveLength(62);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("returns empty for CJK titles so the user fills the slug in", () => {
    expect(slugifyDocTitle("快速开始")).toBe("");
  });
});

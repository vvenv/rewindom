import { describe, expect, it } from "vitest";

import type { MarketingPageListItem } from "../../shared/site-cms.js";

import { groupSitePages } from "./site-page-groups.js";

function page(
  partial: Partial<MarketingPageListItem> &
    Pick<MarketingPageListItem, "id" | "slug" | "locale" | "kind" | "title">,
): MarketingPageListItem {
  return {
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

describe("groupSitePages", () => {
  it("merges same kind+slug into one group, ordered by site locale", () => {
    const groups = groupSitePages(
      [
        page({
          id: "en",
          slug: "about",
          locale: "en",
          kind: "page",
          title: "About",
        }),
        page({
          id: "zh",
          slug: "about",
          locale: "zh-CN",
          kind: "page",
          title: "关于",
        }),
        page({
          id: "home",
          slug: "home",
          locale: "zh-CN",
          kind: "home",
          title: "首页",
        }),
      ],
      "zh-CN",
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      kind: "page",
      slug: "about",
      path: "/about",
      title: "关于",
    });
    expect(groups[0]!.pages.map((item) => item.locale)).toEqual([
      "zh-CN",
      "en",
    ]);
  });

  it("keeps first-seen group order from the input list", () => {
    const groups = groupSitePages(
      [
        page({
          id: "2",
          slug: "about",
          locale: "en",
          kind: "page",
          title: "About",
        }),
        page({
          id: "1",
          slug: "pricing",
          locale: "en",
          kind: "page",
          title: "Pricing",
        }),
      ],
      "en",
    );
    expect(groups.map((group) => group.path)).toEqual(["/about", "/pricing"]);
  });
});

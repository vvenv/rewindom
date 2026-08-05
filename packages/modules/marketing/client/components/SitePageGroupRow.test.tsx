import { registerI18nBundles, setupI18n } from "@be-water/client-kit";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { MARKETING_I18N } from "../i18n.js";
import { groupSitePages } from "../lib/site-page-groups.js";

import { SitePageGroupRow } from "./SitePageGroupRow.js";

import type { SitePageActions } from "../hooks/use-site-page-actions.js";
import type { MarketingPageListItem } from "../../shared/site-cms.js";
import type { ReactNode } from "react";

/** 复制抽屉自己会拉站点数据；这里只验行的排布，把它压成透传的 trigger。 */
vi.mock("./SitePageDuplicateSheet.js", () => ({
  SitePageDuplicateSheet: ({ children }: { children: ReactNode }) => children,
}));

registerI18nBundles([MARKETING_I18N]);
setupI18n("zh-CN");

const actions: SitePageActions = {
  publishPendingId: undefined,
  unpublishPendingId: undefined,
  deletePendingId: undefined,
  togglePublish: vi.fn(),
  remove: vi.fn(async () => {}),
};

function page(
  partial: Partial<MarketingPageListItem> &
    Pick<MarketingPageListItem, "id" | "locale">,
): MarketingPageListItem {
  return {
    slug: "about",
    kind: "page",
    title: "关于我们",
    description: "",
    settings: {},
    status: "draft",
    content_dirty: false,
    sort_order: 0,
    updated_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function renderGroup(pages: MarketingPageListItem[]) {
  const group = groupSitePages(pages, "zh-CN")[0]!;
  return render(
    <MemoryRouter>
      <SitePageGroupRow
        group={group}
        defaultLocale="zh-CN"
        canWrite
        actions={actions}
      />
    </MemoryRouter>,
  );
}

describe("SitePageGroupRow", () => {
  it("collapses a single-language group into one row (no repeated locale line)", () => {
    renderGroup([page({ id: "zh", locale: "zh-CN" })]);

    expect(screen.getByRole("link", { name: "关于我们" })).toHaveAttribute(
      "href",
      "/site/pages/zh",
    );
    expect(screen.getByText("/about")).toBeInTheDocument();
    // 语言名是多语言组才有的第二层，单语言时不该出现
    expect(screen.queryByText("中文")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("expands a multi-language group into one row per locale", () => {
    renderGroup([
      page({ id: "zh", locale: "zh-CN" }),
      page({ id: "en", locale: "en", title: "About" }),
    ]);

    const rows = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText("中文")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("English")).toBeInTheDocument();
    // 组头只出现一次，标题不在语言行里重复
    expect(screen.getAllByRole("link", { name: "关于我们" })).toHaveLength(1);
  });

  it("flags a published page whose draft moved ahead of the live version", () => {
    renderGroup([
      page({
        id: "zh",
        locale: "zh-CN",
        status: "published",
        content_dirty: true,
      }),
    ]);

    expect(screen.getByText("有改动未发布")).toBeInTheDocument();
    expect(screen.queryByText("已发布")).not.toBeInTheDocument();
  });

  it("shows plain published state when the draft is in sync", () => {
    renderGroup([page({ id: "zh", locale: "zh-CN", status: "published" })]);

    expect(screen.getByText("已发布")).toBeInTheDocument();
  });
});

import { registerI18nBundles, setupI18n } from "@be-water/client-kit";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { MARKETING_I18N } from "../i18n.js";

import { SiteDocTemplateRows } from "./SiteDocTemplateRows.js";

import type { SitePageActions } from "../hooks/use-site-page-actions.js";
import type { MarketingPageListItem } from "../../shared/site-cms.js";
import type { ReactNode } from "react";

vi.mock("../hooks/useSite.js", () => ({
  useSiteMutations: () => ({
    createPage: { mutate: vi.fn(), isPending: false },
  }),
}));

vi.mock("./SitePageDuplicateSheet.js", () => ({
  SitePageDuplicateSheet: ({ children }: { children: ReactNode }) => children,
}));

registerI18nBundles([MARKETING_I18N]);
setupI18n("zh-CN");

const actions: SitePageActions = {
  publishPendingId: undefined,
  unpublishPendingId: undefined,
  deletePendingId: undefined,
  reorderPending: false,
  togglePublish: vi.fn(),
  remove: vi.fn(async () => {}),
  move: vi.fn(),
};

function page(
  partial: Partial<MarketingPageListItem> &
    Pick<MarketingPageListItem, "id" | "kind" | "locale">,
): MarketingPageListItem {
  return {
    slug: partial.kind === "doc_article" ? "docs-article" : "docs",
    title: partial.kind === "doc_article" ? "文档详情" : "文档",
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

function renderRows(pages: MarketingPageListItem[]) {
  return render(
    <MemoryRouter>
      <SiteDocTemplateRows
        pages={pages}
        defaultLocale="zh-CN"
        canWrite
        actions={actions}
      />
    </MemoryRouter>,
  );
}

describe("SiteDocTemplateRows", () => {
  it("shows customize affordances when no templates exist yet", () => {
    renderRows([]);

    expect(screen.getByText("文档版式")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "自定义版式" })).toHaveLength(
      2,
    );
    expect(screen.getAllByText("默认版式")).toHaveLength(2);
  });

  it("lists every locale variant once a template is customized", () => {
    renderRows([
      page({ id: "zh", kind: "doc_index", locale: "zh-CN" }),
      page({ id: "en", kind: "doc_index", locale: "en", title: "Docs" }),
    ]);

    // 已自定义的索引按语言展开；详情仍是空态
    const list = screen.getByRole("list");
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText("中文")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("English")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "自定义版式" }),
    ).toBeInTheDocument();
  });
});

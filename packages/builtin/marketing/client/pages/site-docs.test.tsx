import { registerI18nBundles, setupI18n } from "@be-water/client-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { MARKETING_I18N } from "../i18n.js";
import { SiteDocs } from "./site-docs.js";

import type { MarketingDocListItem } from "../../shared/marketing-doc.js";

vi.mock("@be-water/client-kit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@be-water/client-kit")>();
  return {
    ...actual,
    usePermissions: () => ({ hasPermission: () => true }),
    PageLayout: ({
      children,
      title,
    }: {
      children: ReactNode;
      title?: string;
    }) =>
      createElement(
        "div",
        null,
        title ? createElement("h1", null, title) : null,
        children,
      ),
  };
});

vi.mock("../hooks/useSiteDocs.js", () => ({
  useSiteDocs: () => ({
    data: [
      {
        id: "1",
        slug: "quickstart",
        title: "快速开始",
        description: "",
        category: "入门",
        locale: "zh-CN",
        status: "published",
        content_dirty: false,
        sort_order: 0,
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "2",
        slug: "faq",
        title: "FAQ",
        description: "",
        category: "",
        locale: "zh-CN",
        status: "draft",
        content_dirty: false,
        sort_order: 0,
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ] satisfies MarketingDocListItem[],
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

vi.mock("../hooks/use-site-doc-actions.js", () => ({
  useSiteDocActions: () => ({
    pendingId: undefined,
    togglePublish: vi.fn(),
    revert: vi.fn(),
    exportOne: vi.fn(),
    remove: vi.fn(),
  }),
}));

vi.mock("../components/SiteDocEditorSheet.js", () => ({
  SiteDocCreateSheet: ({ children }: { children: ReactNode }) => children,
  SiteDocEditorSheet: () => null,
}));

vi.mock("../components/SiteDocDuplicateSheet.js", () => ({
  SiteDocDuplicateSheet: () => null,
}));

vi.mock("../components/SiteDocTransferActions.js", () => ({
  SiteDocTransferActions: () => null,
}));

registerI18nBundles([MARKETING_I18N]);
setupI18n("zh-CN");

function renderPage(initialUrl = "/app/site/docs") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <SiteDocs />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SiteDocs filtering", () => {
  it("filters the table when a status chip is clicked", () => {
    renderPage();

    expect(screen.getByText("快速开始")).toBeInTheDocument();
    expect(screen.getByText("FAQ")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "草稿" }));

    expect(screen.queryByText("快速开始")).not.toBeInTheDocument();
    expect(screen.getByText("FAQ")).toBeInTheDocument();
  });

  it("respects status from the initial URL", () => {
    renderPage("/app/site/docs?status=draft");

    expect(screen.queryByText("快速开始")).not.toBeInTheDocument();
    expect(screen.getByText("FAQ")).toBeInTheDocument();
  });

  it("clears filters when reset is clicked", () => {
    renderPage("/app/site/docs?status=draft");

    expect(screen.queryByText("快速开始")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle("重置所有筛选"));

    expect(screen.getByText("快速开始")).toBeInTheDocument();
    expect(screen.getByText("FAQ")).toBeInTheDocument();
  });
});

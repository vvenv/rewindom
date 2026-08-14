import { registerI18nBundles, setupI18n } from "@rewindom/module-sdk/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { SITE_DOCS_I18N } from "../i18n.js";
import { SiteDocs } from "./docs.js";

import type { SiteDocListResult } from "../../shared/site-doc.js";

const listResult: SiteDocListResult = {
  items: [
    {
      id: "1",
      slug: "quickstart",
      title: "快速开始",
      description: "",
      category: "intro",
      category_label: "入门",
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
      category_label: "",
      locale: "zh-CN",
      status: "draft",
      content_dirty: false,
      sort_order: 0,
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ],
  page: 1,
  page_size: 20,
  total: 2,
  page_count: 1,
  total_all: 2,
  categories: ["intro"],
  category_catalog: [
    {
      id: "cat-1",
      tenant_id: "t1",
      key: "intro",
      label: "入门",
      sort_order: 0,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ],
  locales: ["zh-CN"],
};

vi.mock("@rewindom/module-sdk/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@rewindom/module-sdk/client")>();
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

const useSiteDocsMock = vi.fn();

vi.mock("../../../../packages/builtin/marketing/client/hooks/useSite.js", () => ({
  useSite: () => ({
    data: { default_locale: "zh-CN" },
  }),
}));

vi.mock("../hooks/useSiteDocs.js", () => ({
  useSiteDocs: (query: unknown) => useSiteDocsMock(query),
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

registerI18nBundles([SITE_DOCS_I18N]);
setupI18n("zh-CN");

function renderPage(initialUrl = "/app/docs") {
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
  it("passes URL filters to the list query", () => {
    useSiteDocsMock.mockReturnValue({
      data: {
        ...listResult,
        items: [listResult.items[1]!],
        total: 1,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });

    renderPage("/app/docs?status=draft");

    expect(useSiteDocsMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "draft" }),
    );
    expect(screen.queryByText("快速开始")).not.toBeInTheDocument();
    expect(screen.getByText("FAQ")).toBeInTheDocument();
  });

  it("clears filters when reset is clicked", () => {
    useSiteDocsMock.mockImplementation((query: { status?: string }) => ({
      data:
        query.status === "draft"
          ? {
              ...listResult,
              items: [listResult.items[1]!],
              total: 1,
            }
          : listResult,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    }));

    renderPage("/app/docs?status=draft");

    expect(screen.queryByText("快速开始")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle("重置所有筛选"));

    expect(screen.getByText("快速开始")).toBeInTheDocument();
    expect(screen.getByText("FAQ")).toBeInTheDocument();
    expect(screen.queryByTitle("重置所有筛选")).not.toBeInTheDocument();
  });

  it("shows filtered empty state instead of crashing when nothing matches", () => {
    useSiteDocsMock.mockReturnValue({
      data: {
        ...listResult,
        items: [],
        total: 0,
        page_count: 1,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });

    renderPage("/app/docs?status=dirty");

    expect(screen.queryByText("快速开始")).not.toBeInTheDocument();
    expect(screen.queryByText("FAQ")).not.toBeInTheDocument();
    expect(screen.getByText("没有匹配的文档")).toBeInTheDocument();
  });
});

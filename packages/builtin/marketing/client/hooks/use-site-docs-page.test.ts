import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it } from "vitest";

import { useSiteDocsPage } from "./use-site-docs-page.js";

function wrapper({
  initialEntries = ["/app/site/docs"],
}: {
  initialEntries?: string[];
} = {}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(MemoryRouter, { initialEntries }, children);
  };
}

describe("useSiteDocsPage", () => {
  it("writes filter params to the URL, resets page, and reads them back", () => {
    const { result } = renderHook(
      () => ({
        page: useSiteDocsPage(),
        location: useLocation(),
      }),
      {
        wrapper: wrapper({
          initialEntries: ["/app/site/docs?page=3"],
        }),
      },
    );

    expect(result.current.page.status).toBeUndefined();
    expect(result.current.page.page).toBe(3);

    act(() => {
      result.current.page.handleFiltersChange({ status: "draft" });
    });

    expect(result.current.location.search).toContain("status=draft");
    expect(result.current.location.search).toContain("page=1");
    expect(result.current.page.status).toBe("draft");
    expect(result.current.page.page).toBe(1);
  });

  it("clears filters from the URL", () => {
    const { result } = renderHook(
      () => ({
        page: useSiteDocsPage(),
        location: useLocation(),
      }),
      {
        wrapper: wrapper({
          initialEntries: ["/app/site/docs?status=draft&q=hello&page=2"],
        }),
      },
    );

    expect(result.current.page.status).toBe("draft");
    expect(result.current.page.q).toBe("hello");

    act(() => {
      result.current.page.handleFiltersChange({
        q: undefined,
        category: undefined,
        status: undefined,
        locale: undefined,
      });
    });

    expect(result.current.page.status).toBeUndefined();
    expect(result.current.page.q).toBeUndefined();
    expect(result.current.location.search).toContain("page=1");
  });

  it("reads page and page_size from the URL like other list pages", () => {
    const { result } = renderHook(() => useSiteDocsPage(), {
      wrapper: wrapper({
        initialEntries: ["/app/site/docs?page=2&page_size=50"],
      }),
    });

    expect(result.current.page).toBe(2);
    expect(result.current.pageSize).toBe(50);
  });
});

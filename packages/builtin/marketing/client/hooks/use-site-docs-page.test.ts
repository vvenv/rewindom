import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it } from "vitest";

import {
  applyDocFilterPatch,
  useSiteDocsPage,
} from "./use-site-docs-page.js";

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
    expect(result.current.location.search).not.toContain("page=");
    expect(result.current.page.status).toBe("draft");
    expect(result.current.page.page).toBe(1);
  });

  it("clears filters from the URL without leaving page=1", () => {
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
    expect(result.current.location.search).toBe("");
    expect(result.current.page.page).toBe(1);
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

  it("chains rapid locale toggles via ref (RR setSearchParams updaters do not compose)", () => {
    const { result } = renderHook(
      () => ({
        page: useSiteDocsPage(),
        location: useLocation(),
      }),
      {
        wrapper: wrapper({
          initialEntries: ["/app/site/docs?status=draft&locale=zh-CN"],
        }),
      },
    );

    // 不包在同一次 act 的 re-render 之间：模拟闭包未更新时连点
    act(() => {
      result.current.page.handleFiltersChange({ locale: "en" });
    });
    act(() => {
      result.current.page.handleFiltersChange({ locale: "zh-CN" });
    });
    act(() => {
      result.current.page.handleFiltersChange({ locale: "en" });
    });

    expect(result.current.location.search).toContain("locale=en");
    expect(result.current.location.search).toContain("status=draft");
    expect(result.current.page.locale).toBe("en");
  });

  it("keeps the last locale when many toggles fire before location re-renders", () => {
    const { result } = renderHook(
      () => ({
        page: useSiteDocsPage(),
        location: useLocation(),
      }),
      {
        wrapper: wrapper({
          initialEntries: ["/app/site/docs?locale=zh-CN"],
        }),
      },
    );

    act(() => {
      // 同一 act 内连续写：若只信 RR 的 fn(prev)，第二次仍看到 zh-CN
      result.current.page.handleFiltersChange({ locale: "en" });
      result.current.page.handleFiltersChange({ locale: "zh-CN" });
      result.current.page.handleFiltersChange({ locale: "en" });
    });

    expect(result.current.page.locale).toBe("en");
    expect(result.current.location.search).toBe("?locale=en");
  });

  it("resets every filter key and preserves unrelated params like sort", () => {
    const { result } = renderHook(
      () => ({
        page: useSiteDocsPage(),
        location: useLocation(),
      }),
      {
        wrapper: wrapper({
          initialEntries: [
            "/app/site/docs?locale=en&status=draft&q=hi&sort_by=title&sort_dir=asc",
          ],
        }),
      },
    );

    act(() => {
      result.current.page.handleFiltersChange({
        q: undefined,
        category: undefined,
        status: undefined,
        locale: undefined,
      });
    });

    expect(result.current.location.search).toBe("?sort_by=title&sort_dir=asc");
    expect(result.current.page.locale).toBeUndefined();
    expect(result.current.page.status).toBeUndefined();
    expect(result.current.page.q).toBeUndefined();
  });

  it("keeps reset when locale toggle and reset fire in the same turn", () => {
    const { result } = renderHook(
      () => ({
        page: useSiteDocsPage(),
        location: useLocation(),
      }),
      {
        wrapper: wrapper({
          initialEntries: ["/app/site/docs"],
        }),
      },
    );

    act(() => {
      result.current.page.handleFiltersChange({ locale: "en" });
      result.current.page.handleFiltersChange({
        q: undefined,
        category: undefined,
        status: undefined,
        locale: undefined,
      });
    });

    expect(result.current.location.search).toBe("");
    expect(result.current.page.locale).toBeUndefined();
  });
});

describe("applyDocFilterPatch", () => {
  it("clears only keys present in the patch", () => {
    const current = new URLSearchParams("locale=en&status=draft&q=x");
    expect(
      applyDocFilterPatch(current, { locale: undefined }).toString(),
    ).toBe("status=draft&q=x");
  });

  it("clears all filter keys on full reset patch", () => {
    const current = new URLSearchParams(
      "locale=en&status=draft&q=x&sort_by=title",
    );
    expect(
      applyDocFilterPatch(current, {
        q: undefined,
        category: undefined,
        status: undefined,
        locale: undefined,
      }).toString(),
    ).toBe("sort_by=title");
  });
});

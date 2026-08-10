import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppNotFoundRedirect } from "./AppNotFoundRedirect.js";

import type * as ClientKit from "@be-water/client-kit";

const publicConfig = vi.hoisted(() => ({
  value: {
    isFetched: true,
    data: { platform_url: "http://127.0.0.1:7300" as string | null },
  },
}));

vi.mock("@be-water/client-kit", async (importOriginal) => {
  const actual = await importOriginal<typeof ClientKit>();
  return {
    ...actual,
    usePublicConfig: () => publicConfig.value,
  };
});

describe("AppNotFoundRedirect", () => {
  beforeEach(() => {
    publicConfig.value = {
      isFetched: true,
      data: { platform_url: "http://127.0.0.1:7300" },
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("公开 CMS 路径硬跳 SSR 文档", () => {
    const replace = vi.fn();
    vi.stubGlobal("location", {
      ...window.location,
      origin: "http://localhost:7300",
      pathname: "/",
      search: "",
      hash: "",
      replace,
    });

    render(
      <MemoryRouter initialEntries={["/about"]}>
        <Routes>
          <Route path="*" element={<AppNotFoundRedirect />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(replace).toHaveBeenCalledWith("/about");
  });

  it("平台控制台 Host 的公开路径进 /platform，不硬跳自己", async () => {
    const replace = vi.fn();
    vi.stubGlobal("location", {
      ...window.location,
      origin: "http://127.0.0.1:7300",
      pathname: "/",
      search: "",
      hash: "",
      replace,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="*" element={<AppNotFoundRedirect />} />
          <Route path="/platform" element={<p>console</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(replace).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText("console")).toBeInTheDocument();
    });
  });

  it("同一公开路径已由 SPA 承接时不 replace 自己", () => {
    const replace = vi.fn();
    vi.stubGlobal("location", {
      ...window.location,
      origin: "http://localhost:7300",
      pathname: "/about",
      search: "",
      hash: "",
      replace,
    });

    render(
      <MemoryRouter initialEntries={["/about"]}>
        <Routes>
          <Route path="*" element={<AppNotFoundRedirect />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(replace).not.toHaveBeenCalled();
  });
});

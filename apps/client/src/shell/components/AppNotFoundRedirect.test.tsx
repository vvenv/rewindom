import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppNotFoundRedirect } from "./AppNotFoundRedirect.js";

describe("AppNotFoundRedirect", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("公开 CMS 路径硬跳 SSR 文档", () => {
    const replace = vi.fn();
    vi.stubGlobal("location", { ...window.location, replace });

    render(
      <MemoryRouter initialEntries={["/about"]}>
        <Routes>
          <Route path="*" element={<AppNotFoundRedirect />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(replace).toHaveBeenCalledWith("/about");
  });
});

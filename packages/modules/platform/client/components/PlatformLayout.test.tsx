import { PlatformNavProvider } from "@be-water/client-kit";
import { createTestQueryClient } from "@be-water/client-test";
import { server } from "@be-water/client-test/server";
import { fireEvent, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, it, expect, vi } from "vitest";


import { createTaskQueryWrapper } from "../../../background-job/client/test-fixtures.js";

import { PlatformLayout } from "./PlatformLayout.js";

const platformNavEntries = [
  {
    type: "link" as const,
    to: "/platform",
    label: "监控",
    icon: () => null,
    end: true,
  },
  {
    type: "group" as const,
    key: "tenant-admin",
    label: "租户",
    icon: () => null,
    children: [
      { to: "/platform/users", label: "用户管理", end: true },
    ],
  },
];

vi.mock("@be-water/client-kit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@be-water/client-kit")>();
  return {
    ...actual,
    usePersistState: ({ defaultValue }: { defaultValue: boolean }) => [
      defaultValue,
      vi.fn(),
    ],
    ThemeToggle: () => <div data-testid="theme-toggle" />,
  };
});

vi.mock("./PlatformMobileNav.js", () => ({
  PlatformMobileNav: () => <nav data-testid="platform-mobile-nav" />,
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">平台页面</div>,
    useLocation: () => ({ pathname: "/platform" }),
  };
});

describe("PlatformLayout", () => {
  beforeEach(() => {
    server.use(
      http.get("/api/system-info", () => HttpResponse.json({ data: {} })),
    );
  });

  const wrapper = createTaskQueryWrapper(createTestQueryClient());

  it("应该渲染平台布局", () => {
    render(
      <PlatformNavProvider entries={platformNavEntries}>
        <MemoryRouter>
          <PlatformLayout />
        </MemoryRouter>
      </PlatformNavProvider>,
      { wrapper },
    );

    expect(screen.getByText("监控面板")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "租户" })).toBeInTheDocument();
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });

  it("应该渲染侧边导航链接", () => {
    render(
      <PlatformNavProvider entries={platformNavEntries}>
        <MemoryRouter>
          <PlatformLayout />
        </MemoryRouter>
      </PlatformNavProvider>,
      { wrapper },
    );

    fireEvent.click(screen.getByRole("button", { name: "租户" }));

    expect(screen.getByRole("link", { name: "用户管理" })).toHaveAttribute(
      "href",
      "/platform/users",
    );
  });
});

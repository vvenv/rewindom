import { PlatformNavProvider } from "@rewindom/client-kit";
import { render, screen } from "@testing-library/react";
import { Building2, LayoutDashboard, Settings } from "lucide-react";
import { MemoryRouter } from "react-router";
import { describe, it, expect } from "vitest";


import { PlatformMobileNav } from "./PlatformMobileNav.js";

const platformNavEntries = [
  {
    type: "link" as const,
    to: "/platform",
    label: "监控",
    icon: LayoutDashboard,
    end: true,
  },
  {
    type: "group" as const,
    key: "tenant-admin",
    label: "租户",
    icon: Building2,
    children: [
      { to: "/platform/tenants", label: "租户管理", end: true },
      { to: "/platform/users", label: "用户管理", end: true },
    ],
  },
  {
    type: "link" as const,
    to: "/platform/settings",
    label: "设置",
    icon: Settings,
  },
];

function renderMobileNav(path = "/platform/tenants") {
  return render(
    <PlatformNavProvider entries={platformNavEntries}>
      <MemoryRouter initialEntries={[path]}>
        <PlatformMobileNav />
      </MemoryRouter>
    </PlatformNavProvider>,
  );
}

describe("PlatformMobileNav", () => {
  it("应渲染导航链接", () => {
    renderMobileNav();

    expect(screen.getByText("租户")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /监控/ })).toHaveAttribute(
      "href",
      "/platform",
    );
    expect(screen.getByRole("link", { name: /设置/ })).toHaveAttribute(
      "href",
      "/platform/settings",
    );
  });

  it("当前路由应高亮", () => {
    renderMobileNav();

    const tenantButton = screen.getByRole("button", { name: /租户/ });
    expect(tenantButton.className).toContain("text-sidebar-accent-foreground");
  });
});

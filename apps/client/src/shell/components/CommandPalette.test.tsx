import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FileText, Palette } from "lucide-react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { filterAppNavSections } from "@/app-nav";

import {
  AppShellConfigProvider,
  type AppShellConfig,
} from "../contexts/app-shell-context.js";

import { CommandPaletteProvider } from "./CommandPalette.js";

import type * as ClientKit from "@rewindom/client-kit";

const access = vi.hoisted(() => ({
  entitlements: { modules: {}, features: {} } as {
    modules: Record<string, boolean>;
    features: Record<string, boolean>;
  },
  permissions: ["site.read"] as string[],
}));

vi.mock("@rewindom/client-kit", async (importOriginal) => {
  const actual = await importOriginal<typeof ClientKit>();
  return {
    ...actual,
    useTenantEntitlements: () => ({
      data: access.entitlements,
      isLoading: false,
    }),
    usePermissions: () => ({
      hasPermission: (permission: string) =>
        access.permissions.includes(permission),
      isLoading: false,
    }),
  };
});

function buildConfig(): AppShellConfig {
  return {
    getNavSections: () => [
      {
        label: "概览",
        items: [{ icon: FileText, label: "工作台", path: "/app/dashboard" }],
      },
      {
        label: "站点",
        items: [
          {
            icon: FileText,
            label: "官网",
            path: "/app/site",
            tenantModule: "tenant-marketing",
          },
        ],
      },
    ],
    filterNavSections: filterAppNavSections,
    getMobileTabItems: () => [],
    filterMobileTabPaths: () => [],
    isNavRouteActive: () => false,
    getAppNavItems: () => [],
    getCommandActions: () => [
      {
        id: "marketing.site-theme",
        label: "外观",
        icon: Palette,
        path: "/app/site/editor?scope=theme",
        tenantModule: "tenant-marketing",
        anyPermission: ["site.read"],
      },
    ],
    resolveMobileHeaderState: () => ({ title: "" }),
    homePathCandidates: [],
    shellContributions: {
      shellProviders: [],
      publicProviders: [],
      sidebarToolbar: [],
      sidebarPrimaryAction: [],
      sidebarPanel: [],
      sidebarUserMenu: [],
      mobileHeaderTrailing: [],
      navBadge: [],
      platformNavBadge: [],
      mobileHeaderRoutes: [],
    },
    platformNavEntries: [],
  };
}

function renderPalette() {
  return render(
    <MemoryRouter initialEntries={["/app/dashboard"]}>
      <AppShellConfigProvider value={buildConfig()}>
        <CommandPaletteProvider>
          <Routes>
            <Route path="/app/dashboard" element={<p>dashboard</p>} />
            <Route path="/app/site/editor" element={<p>site editor</p>} />
          </Routes>
        </CommandPaletteProvider>
      </AppShellConfigProvider>
    </MemoryRouter>,
  );
}

async function openPalette(): Promise<HTMLElement> {
  fireEvent.keyDown(window, { key: "k", metaKey: true });
  return waitFor(() => screen.getByPlaceholderText("搜索页面与操作…"));
}

beforeAll(() => {
  // jsdom 没有 scrollIntoView，cmdk 选中项时会调它
  Element.prototype.scrollIntoView = vi.fn();
});

describe("CommandPalette", () => {
  it("⌘K 打开后同时列出导航项与模块贡献的动作", async () => {
    access.entitlements = { modules: {}, features: {} };
    access.permissions = ["site.read"];
    renderPalette();

    expect(screen.queryByPlaceholderText("搜索页面与操作…")).toBeNull();

    await openPalette();

    expect(screen.getByRole("option", { name: "工作台" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "官网" })).toBeInTheDocument();
    // 动作归入「操作」分组，与导航项分开
    expect(screen.getByRole("option", { name: "外观" })).toBeInTheDocument();
  });

  it("选中后跳转并关闭", async () => {
    access.entitlements = { modules: {}, features: {} };
    access.permissions = ["site.read"];
    renderPalette();

    await openPalette();
    fireEvent.click(screen.getByRole("option", { name: "外观" }));

    await waitFor(() => {
      expect(screen.getByText("site editor")).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText("搜索页面与操作…")).toBeNull();
  });

  it("输入只保留命中项", async () => {
    access.entitlements = { modules: {}, features: {} };
    access.permissions = ["site.read"];
    renderPalette();

    const input = await openPalette();
    fireEvent.change(input, { target: { value: "外观" } });

    await waitFor(() => {
      expect(screen.queryByRole("option", { name: "工作台" })).toBeNull();
    });
    expect(screen.getByRole("option", { name: "外观" })).toBeInTheDocument();
  });

  it("租户关掉模块后，对应的导航项与动作一并搜不到", async () => {
    access.entitlements = {
      modules: { "tenant-marketing": false },
      features: {},
    };
    access.permissions = ["site.read"];
    renderPalette();

    await openPalette();

    expect(screen.getByRole("option", { name: "工作台" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "官网" })).toBeNull();
    expect(screen.queryByRole("option", { name: "外观" })).toBeNull();
  });

  it("缺少权限时动作不出现（与侧栏同口径的 fail-closed）", async () => {
    access.entitlements = { modules: {}, features: {} };
    access.permissions = [];
    renderPalette();

    await openPalette();

    expect(screen.getByRole("option", { name: "工作台" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "外观" })).toBeNull();
  });
});

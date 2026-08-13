import { render, screen, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ResolvedTenantAppearance } from "@rewindom/shared";

import {
  ThemePaletteProvider,
  useThemePalette,
} from "./theme-palette-context.js";

const mockAppearance = vi.hoisted(() => ({
  data: undefined as ResolvedTenantAppearance | undefined,
}));

vi.mock("../hooks/useTenantAppearance.js", () => ({
  useTenantAppearance: () => mockAppearance,
  TENANT_APPEARANCE_QUERY_KEY: ["tenant-appearance"],
}));

function appearance(
  overrides: Partial<ResolvedTenantAppearance>,
): ResolvedTenantAppearance {
  return {
    theme: "azure",
    theme_source: "platform",
    layout: "sidebar",
    layout_source: "platform",
    locale: "zh-CN",
    locale_source: "platform",
    ...overrides,
  };
}

function Probe() {
  const { palette, userChoice, defaultPalette, setPalette } = useThemePalette();
  return (
    <div>
      <span data-testid="palette">{palette}</span>
      <span data-testid="default">{defaultPalette}</span>
      <span data-testid="choice">{userChoice ?? "-"}</span>
      <button onClick={() => setPalette("slate")}>选 slate</button>
      <button onClick={() => setPalette(null)}>跟随默认</button>
    </div>
  );
}

describe("ThemePaletteProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    mockAppearance.data = undefined;
  });

  it("接口未返回时用兜底配色，并把 data-theme 打到 <html>", () => {
    render(
      <ThemePaletteProvider>
        <Probe />
      </ThemePaletteProvider>,
    );

    expect(screen.getByTestId("palette")).toHaveTextContent("azure");
    expect(document.documentElement.dataset.theme).toBe("azure");
  });

  it("采用服务端下发的租户默认主题", () => {
    mockAppearance.data = appearance({ theme: "slate" });

    render(
      <ThemePaletteProvider>
        <Probe />
      </ThemePaletteProvider>,
    );

    expect(screen.getByTestId("palette")).toHaveTextContent("slate");
    expect(document.documentElement.dataset.theme).toBe("slate");
  });

  it("用户选择覆盖租户默认，并持久化到 localStorage", async () => {
    mockAppearance.data = appearance({ theme: "azure" });

    render(
      <ThemePaletteProvider>
        <Probe />
      </ThemePaletteProvider>,
    );

    await act(async () => {
      screen.getByText("选 slate").click();
    });

    expect(screen.getByTestId("palette")).toHaveTextContent("slate");
    expect(screen.getByTestId("default")).toHaveTextContent("azure");
    expect(document.documentElement.dataset.theme).toBe("slate");
    expect(localStorage.getItem("theme-palette")).toBe("slate");

    await act(async () => {
      screen.getByText("跟随默认").click();
    });

    expect(screen.getByTestId("palette")).toHaveTextContent("azure");
    expect(screen.getByTestId("choice")).toHaveTextContent("-");
    expect(localStorage.getItem("theme-palette")).toBeNull();
  });

  it("首帧就读取上次缓存的默认值，不等接口", () => {
    localStorage.setItem("theme-palette-default", "slate");

    render(
      <ThemePaletteProvider>
        <Probe />
      </ThemePaletteProvider>,
    );

    expect(screen.getByTestId("palette")).toHaveTextContent("slate");
  });

  it("卸载后移除 data-theme，登录页与平台控制台回到基础配色", () => {
    mockAppearance.data = appearance({ theme: "slate" });

    const { unmount } = render(
      <ThemePaletteProvider>
        <Probe />
      </ThemePaletteProvider>,
    );
    expect(document.documentElement.dataset.theme).toBe("slate");

    unmount();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("Provider 之外调用 useThemePalette 返回兜底值且不报错", () => {
    render(<Probe />);
    expect(screen.getByTestId("palette")).toHaveTextContent("azure");
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});

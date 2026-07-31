import { render, screen, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ShellLayoutProvider, useShellLayout } from "./shell-layout-context.js";

import type { ResolvedTenantAppearance } from "@be-water/shared";

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
    theme: "water",
    theme_source: "platform",
    layout: "sidebar",
    layout_source: "platform",
    locale: "zh-CN",
    locale_source: "platform",
    ...overrides,
  };
}

function Probe() {
  const { layout, userChoice, defaultLayout, setLayout } = useShellLayout();
  return (
    <div>
      <span data-testid="layout">{layout}</span>
      <span data-testid="default">{defaultLayout}</span>
      <span data-testid="choice">{userChoice ?? "-"}</span>
      <button onClick={() => setLayout("topbar")}>选 topbar</button>
      <button onClick={() => setLayout(null)}>跟随默认</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <ShellLayoutProvider>
      <Probe />
    </ShellLayoutProvider>,
  );
}

describe("ShellLayoutProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    mockAppearance.data = undefined;
  });

  it("接口未返回时用兜底布局", () => {
    renderProbe();
    expect(screen.getByTestId("layout")).toHaveTextContent("sidebar");
  });

  it("采用服务端下发的租户默认布局", () => {
    mockAppearance.data = appearance({ layout: "topbar" });
    renderProbe();
    expect(screen.getByTestId("layout")).toHaveTextContent("topbar");
  });

  it("用户选择覆盖默认，并持久化到 localStorage", async () => {
    mockAppearance.data = appearance({ layout: "sidebar" });
    renderProbe();

    await act(async () => {
      screen.getByText("选 topbar").click();
    });

    expect(screen.getByTestId("layout")).toHaveTextContent("topbar");
    expect(screen.getByTestId("default")).toHaveTextContent("sidebar");
    expect(localStorage.getItem("shell-layout")).toBe("topbar");

    await act(async () => {
      screen.getByText("跟随默认").click();
    });

    expect(screen.getByTestId("layout")).toHaveTextContent("sidebar");
    expect(screen.getByTestId("choice")).toHaveTextContent("-");
    expect(localStorage.getItem("shell-layout")).toBeNull();
  });

  it("首帧就读取上次缓存的默认值，不等接口", () => {
    localStorage.setItem("shell-layout-default", "topbar");
    renderProbe();
    expect(screen.getByTestId("layout")).toHaveTextContent("topbar");
  });

  it("localStorage 里的非法值当作跟随默认", () => {
    localStorage.setItem("shell-layout", "diagonal");
    mockAppearance.data = appearance({ layout: "topbar" });

    renderProbe();

    expect(screen.getByTestId("choice")).toHaveTextContent("-");
    expect(screen.getByTestId("layout")).toHaveTextContent("topbar");
  });

  it("Provider 之外调用返回兜底值且不报错", () => {
    render(<Probe />);
    expect(screen.getByTestId("layout")).toHaveTextContent("sidebar");
  });
});

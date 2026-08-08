import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { ErrorLogFilters } from "./ErrorLogFilters.js";

vi.mock("@be-water/client-kit", async () => {
  const { clientShellTestMock } =
    await import("@be-water/client-test/mocks/client-shell");
  return {
    ...clientShellTestMock,
    DateTimeRangePicker: () => <div data-testid="datetime-range-picker" />,
    FilterBar: clientShellTestMock.PageFilterBar,
  };
});

describe("ErrorLogFilters", () => {
  it("应该渲染级别与时间范围筛选", () => {
    render(<ErrorLogFilters filters={{}} onFiltersChange={vi.fn()} />);

    expect(screen.getByText("全部级别")).toBeInTheDocument();
    expect(screen.getByTestId("datetime-range-picker")).toBeInTheDocument();
  });

  it("showTenantFilter 时才渲染租户下拉", () => {
    const { rerender } = render(
      <ErrorLogFilters filters={{}} onFiltersChange={vi.fn()} />,
    );

    // TenantFilterProvider 挂在 ShellProviders 上，租户 AppLayout 同样在其作用域内，
    // 所以 useTenantFilter() 非空并不代表该显示——必须由调用方显式开启。
    expect(screen.queryByTestId("tenant-combobox")).not.toBeInTheDocument();

    rerender(
      <ErrorLogFilters filters={{}} onFiltersChange={vi.fn()} showTenantFilter />,
    );

    expect(screen.getByTestId("tenant-combobox")).toBeInTheDocument();
  });

  it("应直接显示统一搜索框", () => {
    render(<ErrorLogFilters filters={{}} onFiltersChange={vi.fn()} />);

    expect(
      screen.getByPlaceholderText("账号 / 路由 / 错误代码"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /更多筛选/ }),
    ).not.toBeInTheDocument();
  });

  it("搜索应触发 onFiltersChange", () => {
    const onFiltersChange = vi.fn();

    render(<ErrorLogFilters filters={{}} onFiltersChange={onFiltersChange} />);

    fireEvent.change(screen.getByTestId("search"), {
      target: { value: "/api/orders" },
    });

    expect(onFiltersChange).toHaveBeenCalledWith({
      q: "/api/orders",
    });
  });
});

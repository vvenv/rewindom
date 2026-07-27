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

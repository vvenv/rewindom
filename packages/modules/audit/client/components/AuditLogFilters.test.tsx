import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { AuditLogFilters } from "./AuditLogFilters.js";

vi.mock("@be-water/client-kit", async () => {
  const { clientShellTestMock } =
    await import("@be-water/client-test/mocks/client-shell");
  return {
    ...clientShellTestMock,
    DateTimeRangePicker: () => <div data-testid="datetime-range-picker" />,
    FilterBar: clientShellTestMock.PageFilterBar,
  };
});

describe("AuditLogFilters", () => {
  const defaultProps = {
    filters: {},
    onTenantChange: vi.fn(),
    onUsernameChange: vi.fn(),
    onFiltersChange: vi.fn(),
    onReset: vi.fn(),
  };

  it("应该渲染操作类型与时间范围筛选", () => {
    render(<AuditLogFilters {...defaultProps} />);

    expect(screen.getByText("全部操作")).toBeInTheDocument();
    expect(screen.getByTestId("datetime-range-picker")).toBeInTheDocument();
    expect(screen.getByTestId("tenant-combobox")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("账号")).toBeInTheDocument();
  });

  it("账号搜索应触发 onUsernameChange", () => {
    const onUsernameChange = vi.fn();

    render(
      <AuditLogFilters {...defaultProps} onUsernameChange={onUsernameChange} />,
    );

    fireEvent.change(screen.getByPlaceholderText("账号"), {
      target: { value: "admin" },
    });

    expect(onUsernameChange).toHaveBeenCalledWith("admin");
  });

  it("有筛选条件时应显示重置按钮", () => {
    render(
      <AuditLogFilters {...defaultProps} filters={{ username: "admin" }} />,
    );

    expect(screen.getByTitle("重置所有筛选")).toBeInTheDocument();
  });
});

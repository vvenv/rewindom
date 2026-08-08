import {
  registerI18nBundles,
  setupI18n,
} from "@be-water/client-kit/i18n/setup";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { AUDIT_I18N } from "../i18n.js";
import { AuditLogFilters } from "./AuditLogFilters.js";

registerI18nBundles([AUDIT_I18N]);
setupI18n("zh-CN");

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
  });

  it("应该支持输入账号筛选", () => {
    render(
      <AuditLogFilters {...defaultProps} filters={{ username: "" }} />,
    );

    fireEvent.change(screen.getByPlaceholderText("账号"), {
      target: { value: "admin" },
    });

    expect(defaultProps.onUsernameChange).toHaveBeenCalledWith("admin");
  });
});

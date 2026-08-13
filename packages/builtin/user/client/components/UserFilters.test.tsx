import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { UserFilters } from "./UserFilters.js";

vi.mock("@rewindom/client-kit", async () => {
  const { clientShellTestMock } =
    await import("@rewindom/client-test/mocks/client-shell");
  return clientShellTestMock;
});

describe("UserFilters", () => {
  it("应渲染搜索与管理员类型筛选", () => {
    render(<UserFilters filters={{}} onFiltersChange={vi.fn()} />);

    expect(screen.getByPlaceholderText("搜索用户名...")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "全部类型" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "系统管理员" }),
    ).toBeInTheDocument();
  });

  it("管理员类型变更应触发 onFiltersChange", () => {
    const onFiltersChange = vi.fn();

    render(
      <UserFilters
        filters={{ q: "admin" }}
        onFiltersChange={onFiltersChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "系统管理员" }));

    expect(onFiltersChange).toHaveBeenCalledWith({
      q: "admin",
      admin_type: "system_admin",
    });
  });

  it("选择全部类型应设为 undefined", () => {
    const onFiltersChange = vi.fn();

    render(
      <UserFilters
        filters={{ admin_type: "regular" }}
        onFiltersChange={onFiltersChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "全部类型" }));

    expect(onFiltersChange).toHaveBeenCalledWith({
      q: undefined,
      admin_type: undefined,
    });
  });
});

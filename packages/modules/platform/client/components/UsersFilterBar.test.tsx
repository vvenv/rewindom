import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { UsersFilterBar } from "./UsersFilterBar.js";

vi.mock("@be-water/client-kit", async () => {
  const { clientShellTestMock } =
    await import("@be-water/client-test/mocks/client-shell");
  return clientShellTestMock;
});

vi.mock("./TenantCombobox.js", () => ({
  TenantCombobox: () => <div data-testid="tenant-combobox" />,
}));

describe("UsersFilterBar", () => {
  it("应该渲染搜索框与租户筛选", () => {
    render(
      <UsersFilterBar
        hasActiveFilters={false}
        onSearchChange={vi.fn()}
        onTenantChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText("搜索用户名")).toBeInTheDocument();
    expect(screen.getByTestId("tenant-combobox")).toBeInTheDocument();
  });

  it("有筛选条件时应显示重置按钮", () => {
    render(
      <UsersFilterBar
        search="demo"
        hasActiveFilters
        onSearchChange={vi.fn()}
        onTenantChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByTitle("重置所有筛选")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, it, expect, vi } from "vitest";

import { TenantFilters } from "./TenantFilters.js";

vi.mock("@be-water/client-kit", async () => {
  const { clientShellTestMock } =
    await import("@be-water/client-test/mocks/client-shell");
  return clientShellTestMock;
});

describe("TenantFilters", () => {
  it("应该渲染搜索框", () => {
    render(
      <MemoryRouter>
        <TenantFilters filters={{}} />
      </MemoryRouter>,
    );

    expect(screen.getByPlaceholderText("搜索标识或名称")).toBeInTheDocument();
  });

  it("应该渲染租户状态筛选", () => {
    render(
      <MemoryRouter>
        <TenantFilters filters={{}} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("全部状态")).toBeInTheDocument();
  });

  it("有筛选条件时应显示重置按钮", () => {
    render(
      <MemoryRouter>
        <TenantFilters filters={{ q: "demo" }} />
      </MemoryRouter>,
    );

    expect(screen.getByTitle("重置所有筛选")).toBeInTheDocument();
  });
});

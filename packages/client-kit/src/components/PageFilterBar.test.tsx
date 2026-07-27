import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { PageFilterBar } from "./PageFilterBar";

vi.mock("./DebouncedSearchInput", () => ({
  DebouncedSearchInput: ({
    value,
    onCommit,
    placeholder,
  }: {
    value?: string;
    onCommit: (value: string) => void;
    placeholder?: string;
  }) => (
    <input
      data-testid="search"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onCommit(e.target.value)}
    />
  ),
}));

describe("PageFilterBar", () => {
  it("应渲染搜索框与可见筛选组", () => {
    const onSeverityChange = vi.fn();

    render(
      <PageFilterBar
        search={{
          value: "",
          onCommit: vi.fn(),
          placeholder: "搜索…",
        }}
        groups={[
          {
            id: "severity",
            options: [
              { value: "all", label: "全部等级" },
              { value: "critical", label: "高风险" },
            ],
            value: "all",
            onChange: onSeverityChange,
          },
        ]}
      />,
    );

    expect(screen.getByPlaceholderText("搜索…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "高风险" })).toBeInTheDocument();
  });

  it("超过 1 个筛选组时应显示更多筛选", () => {
    render(
      <PageFilterBar
        groups={[
          {
            id: "a",
            options: [{ value: "all", label: "A" }],
            value: "all",
            onChange: vi.fn(),
          },
          {
            id: "b",
            options: [{ value: "all", label: "B" }],
            value: "all",
            onChange: vi.fn(),
          },
          {
            id: "c",
            options: [{ value: "all", label: "C" }],
            value: "all",
            onChange: vi.fn(),
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("button", { name: /更多筛选/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "C" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /更多筛选/ }));

    expect(screen.getByRole("button", { name: "C" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /收起筛选/ }),
    ).toBeInTheDocument();
  });

  it("hideWhenEmpty 为 true 且选项为空时应隐藏该组", () => {
    render(
      <PageFilterBar
        groups={[
          {
            id: "market",
            options: [],
            value: "all",
            onChange: vi.fn(),
            hideWhenEmpty: true,
          },
          {
            id: "status",
            options: [{ value: "all", label: "全部状态" }],
            value: "all",
            onChange: vi.fn(),
          },
        ]}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "全部状态" }),
    ).toBeInTheDocument();
  });

  it("有活跃筛选时应显示重置按钮", () => {
    const onReset = vi.fn();

    render(
      <PageFilterBar
        groups={[
          {
            id: "status",
            options: [{ value: "all", label: "全部状态" }],
            value: "all",
            onChange: vi.fn(),
          },
        ]}
        hasActiveFilters
        onReset={onReset}
      />,
    );

    fireEvent.click(screen.getByTitle("重置所有筛选"));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("应渲染 inlineContent 与搜索框同一行", () => {
    render(
      <PageFilterBar
        search={{
          value: "",
          onCommit: vi.fn(),
          placeholder: "搜索…",
        }}
        inlineContent={<div data-testid="inline-control">租户</div>}
      />,
    );

    expect(screen.getByPlaceholderText("搜索…")).toBeInTheDocument();
    expect(screen.getByTestId("inline-control")).toBeInTheDocument();
  });

  it("layout=inline 时应直接展示全部筛选组且无更多筛选", () => {
    render(
      <PageFilterBar
        layout="inline"
        groups={[
          {
            id: "a",
            options: [{ value: "all", label: "A" }],
            value: "all",
            onChange: vi.fn(),
          },
          {
            id: "b",
            options: [{ value: "all", label: "B" }],
            value: "all",
            onChange: vi.fn(),
          },
        ]}
        expandedContent={<div data-testid="extra-filter">extra</div>}
      />,
    );

    expect(screen.getByRole("button", { name: "B" })).toBeInTheDocument();
    expect(screen.getByTestId("extra-filter")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /更多筛选/ }),
    ).not.toBeInTheDocument();
  });

  it("选中 neutral 选项时不应使用主色高亮", () => {
    render(
      <PageFilterBar
        groups={[
          {
            id: "severity",
            options: [
              { value: "all", label: "全部等级" },
              { value: "critical", label: "高风险" },
            ],
            value: "all",
            onChange: vi.fn(),
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "全部等级" })).toHaveClass(
      "bg-secondary",
    );
    expect(screen.getByRole("button", { name: "全部等级" })).not.toHaveClass(
      "bg-primary",
    );
  });

  it("选中非 neutral 选项时应使用主色高亮", () => {
    render(
      <PageFilterBar
        groups={[
          {
            id: "severity",
            options: [
              { value: "all", label: "全部等级" },
              { value: "critical", label: "高风险" },
            ],
            value: "critical",
            onChange: vi.fn(),
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "高风险" })).toHaveClass(
      "bg-primary",
    );
    expect(screen.getByRole("button", { name: "全部等级" })).not.toHaveClass(
      "bg-primary",
    );
  });

  it("选项超过 maxVisibleOptions 时应折叠并可展开", () => {
    render(
      <PageFilterBar
        groups={[
          {
            id: "product",
            options: [
              { value: "all", label: "全部产品" },
              { value: "p1", label: "产品 1" },
              { value: "p2", label: "产品 2" },
              { value: "p3", label: "产品 3" },
              { value: "p4", label: "产品 4" },
              { value: "p5", label: "产品 5" },
              { value: "p6", label: "产品 6" },
            ],
            value: "all",
            onChange: vi.fn(),
            maxVisibleOptions: 5,
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "产品 4" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "产品 5" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "产品 6" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /展开 2 项/ }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /展开 2 项/ }));

    expect(screen.getByRole("button", { name: "产品 6" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /收起/ })).toBeInTheDocument();
  });

  it("折叠时应保留显示当前选中的隐藏选项", () => {
    render(
      <PageFilterBar
        groups={[
          {
            id: "product",
            options: [
              { value: "all", label: "全部产品" },
              { value: "p1", label: "产品 1" },
              { value: "p2", label: "产品 2" },
              { value: "p3", label: "产品 3" },
              { value: "p4", label: "产品 4" },
              { value: "p5", label: "产品 5" },
              { value: "p6", label: "产品 6" },
            ],
            value: "p6",
            onChange: vi.fn(),
            maxVisibleOptions: 5,
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "产品 6" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "产品 5" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /展开 2 项/ }),
    ).toBeInTheDocument();
  });
});

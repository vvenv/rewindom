import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { DataTableColumnHeader } from "./DataTableColumnHeader";

function createColumn(
  overrides: {
    canSort?: boolean;
    sorted?: false | "asc" | "desc";
  } = {},
) {
  const { canSort = true, sorted = false } = overrides;
  return {
    getCanSort: () => canSort,
    getIsSorted: () => sorted,
    toggleSorting: vi.fn(),
  };
}

describe("DataTableColumnHeader", () => {
  it("不可排序时只显示标题", () => {
    const column = createColumn({ canSort: false });

    render(<DataTableColumnHeader column={column as never} title="订单编号" />);

    expect(screen.getByText("订单编号")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("可排序时显示按钮", () => {
    const column = createColumn();

    render(<DataTableColumnHeader column={column as never} title="金额" />);

    expect(screen.getByRole("button")).toHaveTextContent("金额");
  });

  it("点击应切换排序", () => {
    const toggleSorting = vi.fn();
    const column = {
      getCanSort: () => true,
      getIsSorted: () => "asc" as const,
      toggleSorting,
    };

    render(<DataTableColumnHeader column={column as never} title="金额" />);

    fireEvent.click(screen.getByRole("button"));

    expect(toggleSorting).toHaveBeenCalledWith(true);
  });
});

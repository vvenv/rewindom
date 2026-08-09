import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter } from "react-router";
import { describe, it, expect, vi } from "vitest";

import { DataTable, type DataTableFeatures } from "./DataTable";

import type { ColumnDef } from "@tanstack/react-table";

interface Row {
  id: number;
  name: string;
  age: number;
}

// 真实渲染：不再 mock 任何 UI 组件（Button/Table/Checkbox/Card/Pagination 等）。
// Pagination 依赖 react-router，用 MemoryRouter 包裹即可。
function renderTable(props: Parameters<typeof DataTable<Row>>[0]) {
  return render(
    <MemoryRouter>
      <DataTable<Row> {...props} />
    </MemoryRouter>,
  );
}

const columns: ColumnDef<DataTableFeatures, Row>[] = [
  { header: "Name", accessorKey: "name" },
  { header: "Age", accessorKey: "age" },
];

const mockData: Row[] = [
  { id: 1, name: "John", age: 30 },
  { id: 2, name: "Jane", age: 25 },
];

describe("DataTable", () => {
  it("应该渲染表格数据", () => {
    renderTable({ columns, data: mockData });

    expect(screen.getByText("John")).toBeInTheDocument();
    expect(screen.getByText("Jane")).toBeInTheDocument();
  });

  it("应该显示加载状态", () => {
    renderTable({ columns, data: [], isLoading: true });

    expect(screen.getByText("加载中...")).toBeInTheDocument();
  });

  it("应该显示错误状态", () => {
    const error = new Error("Network error");
    renderTable({ columns, data: [], isError: true, error });

    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("空数据且没给文案时回落到 common:noData", () => {
    renderTable({ columns, data: [] });

    expect(screen.getByText("暂无数据")).toBeInTheDocument();
  });

  it("应该支持自定义空态标题与说明", () => {
    renderTable({
      columns,
      data: [],
      emptyTitle: "没有找到记录",
      emptyDescription: "换个筛选条件再试",
    });

    expect(screen.getByText("没有找到记录")).toBeInTheDocument();
    expect(screen.getByText("换个筛选条件再试")).toBeInTheDocument();
  });

  it("应该支持自定义加载消息", () => {
    renderTable({
      columns,
      data: [],
      isLoading: true,
      loadingMessage: "正在加载...",
    });

    expect(screen.getByText("正在加载...")).toBeInTheDocument();
  });

  it("应该显示分页组件", () => {
    renderTable({
      columns,
      data: mockData,
      pageSize: 10,
      page: 1,
      total: 100,
      pageCount: 10,
    });

    // 真实 Pagination 渲染 "共 N 条" 文本，header + footer 各一个
    expect(screen.getAllByText(/共 100 条/)).toHaveLength(2);
  });

  it("上方分页器只保留翻页，每页条数与跳页仅出现在下方", () => {
    renderTable({
      columns,
      data: mockData,
      pageSize: 10,
      page: 1,
      total: 100,
      pageCount: 10,
    });

    expect(screen.getAllByLabelText("下一页")).toHaveLength(2);
    // 每页条数（Select trigger 文本）与「前往 N 页」只属于下方主分页器
    expect(screen.getAllByText(/条\/页/)).toHaveLength(1);
    expect(screen.getAllByText("前往")).toHaveLength(1);
  });

  it("只有一页时不渲染上方分页器", () => {
    renderTable({
      columns,
      data: mockData,
      pageSize: 10,
      page: 1,
      total: 2,
      pageCount: 1,
    });

    expect(screen.getAllByText(/共 2 条/)).toHaveLength(1);
    expect(screen.getAllByLabelText("下一页")).toHaveLength(1);
  });

  it("应该支持行点击", () => {
    const onRowClick = vi.fn();
    renderTable({ columns, data: mockData, onRowClick });

    const rows = screen.getAllByRole("row");
    rows[1].click(); // Skip header row

    expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it("应该支持行选择", () => {
    const onSelectionChange = vi.fn();
    renderTable({
      columns,
      data: mockData,
      enableRowSelection: true,
      onSelectionChange,
    });

    // 真实 Radix Checkbox 渲染为 button[role=checkbox]：
    // 第一个是表头全选，后续为各行
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]); // First data row checkbox

    expect(onSelectionChange).toHaveBeenCalled();
  });

  it("应该支持行选择条件", () => {
    const isRowSelectable = (row: Row) => row.id === 1;
    renderTable({
      columns,
      data: mockData,
      enableRowSelection: true,
      isRowSelectable,
    });

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[1]).not.toBeDisabled(); // First row selectable
    expect(checkboxes[2]).toBeDisabled(); // Second row not selectable
  });

  it("onSelectionChange 接到受控 state 时不陷入无限渲染", () => {
    // 回归：v9 的 useTable 每次渲染返回新包装对象，若选择通知 effect 把 table
    // 放进依赖，会与父级 setState 形成死循环（Maximum update depth exceeded）。
    // 用受控 selectedRows 的父组件复现真实用法。
    function Wrapper() {
      const [, setSelected] = useState<Row[]>([]);
      return (
        <MemoryRouter>
          <DataTable<Row>
            columns={columns}
            data={mockData}
            enableRowSelection
            onSelectionChange={setSelected}
          />
        </MemoryRouter>
      );
    }

    const { getAllByRole } = render(<Wrapper />);

    // 渲染未抛「Maximum update depth exceeded」即视为通过；再验证交互仍可用
    const checkboxes = getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);
    expect(checkboxes[1]).toBeChecked();
  });

  it("应该显示头部操作", () => {
    renderTable({
      columns,
      data: mockData,
      headerActions: <button>操作</button>,
    });

    expect(screen.getByText("操作")).toBeInTheDocument();
  });

  it("应该处理受控分页", () => {
    renderTable({
      columns,
      data: mockData,
      page: 2,
      pageSize: 10,
      total: 100,
      pageCount: 10,
    });

    expect(screen.getAllByText(/共 100 条/)).toHaveLength(2);
  });

  it("应该处理非受控分页", () => {
    renderTable({ columns, data: mockData, pageSize: 10 });

    // 2 条数据只够一页，上方分页器不渲染
    expect(screen.getAllByText(/共 2 条/)).toHaveLength(1);
  });

  it("应该将 meta.align 应用到操作列并右对齐", () => {
    const actionColumns: ColumnDef<DataTableFeatures, Row>[] = [
      { header: "Name", accessorKey: "name" },
      {
        id: "actions",
        header: "操作",
        meta: { align: "right" },
        cell: () => <button type="button">编辑</button>,
      },
    ];
    const { container } = renderTable({
      columns: actionColumns,
      data: mockData,
      enableRowSelection: true,
    });

    const headers = container.querySelectorAll("thead th");
    const actionHeader = headers[headers.length - 1];
    expect(actionHeader?.textContent).toContain("操作");
    expect(actionHeader?.className).toContain("w-[1%]");

    const headerWrap = actionHeader?.querySelector(":scope > div");
    expect(headerWrap?.className).toContain("justify-end");

    const actionCell = container.querySelector("tbody td:last-child");
    expect(actionCell?.className).toContain("w-[1%]");

    const cellWrap = actionCell?.querySelector(":scope > div");
    expect(cellWrap?.className).toContain("justify-end");
    expect(cellWrap?.querySelector("button")).toBeInTheDocument();
  });
});

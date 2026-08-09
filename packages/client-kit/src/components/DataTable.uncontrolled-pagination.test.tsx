import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { DataTable, type DataTableFeatures } from "./DataTable";

import type { ColumnDef } from "@tanstack/react-table";

interface Row {
  id: number;
  name: string;
}

const columns: ColumnDef<DataTableFeatures, Row>[] = [
  { accessorKey: "name", header: "Name" },
];

const data: Row[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `Row ${i + 1}`,
}));

describe("DataTable uncontrolled pagination", () => {
  it("changes rows via local callbacks without writing URL search", () => {
    render(
      <MemoryRouter initialEntries={["/list"]}>
        <DataTable columns={columns} data={data} pageSize={10} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Row 1")).toBeInTheDocument();
    expect(screen.queryByText("Row 11")).not.toBeInTheDocument();
    expect(window.location.search).toBe("");

    fireEvent.click(screen.getAllByRole("button", { name: "下一页" })[0]!);

    expect(screen.queryByText("Row 1")).not.toBeInTheDocument();
    expect(screen.getByText("Row 11")).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("changes page size locally without writing URL search", async () => {
    render(
      <MemoryRouter initialEntries={["/list"]}>
        <DataTable columns={columns} data={data} pageSize={10} />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Row 11")).not.toBeInTheDocument();

    // Radix Select：打开触发器后点选项
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: "20条/页" }));

    expect(screen.getByText("Row 11")).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable, type DataTableFeatures } from "./DataTable";

type Row = { id: string; name: string };

const columns: ColumnDef<DataTableFeatures, Row>[] = [
  { accessorKey: "name", header: "Name" },
];

describe("DataTable data updates", () => {
  it("re-renders rows when data prop changes", () => {
    const { rerender } = render(
      <MemoryRouter>
        <DataTable
          columns={columns}
          data={[
            { id: "1", name: "Alice" },
            { id: "2", name: "Bob" },
          ]}
          pageSize={20}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <DataTable
          columns={columns}
          data={[{ id: "1", name: "Alice" }]}
          pageSize={20}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });
});

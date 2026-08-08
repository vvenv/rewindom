import { cn } from "@be-water/ui/utils";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

import type { DataTableFeatures } from "./DataTable";
import type { Column, RowData } from "@tanstack/react-table";

interface DataTableColumnHeaderProps<TData extends RowData, TValue> {
  column: Column<DataTableFeatures, TData, TValue>;
  title: string;
  className?: string;
  /** 表头内容对齐；操作列等配合列 `meta.align: "right"` */
  align?: "start" | "end";
}

export function DataTableColumnHeader<TData extends RowData, TValue>({
  column,
  title,
  className,
  align = "start",
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return (
      <div
        className={cn(
          "flex w-full",
          align === "end" && "justify-end",
          className,
        )}
      >
        {title}
      </div>
    );
  }

  const sorted = column.getIsSorted();
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1 cursor-pointer select-none bg-transparent border-0 p-0",
        align === "end" && "ml-auto",
        className,
      )}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      <span>{title}</span>
      {sorted === "asc" ? (
        <ChevronUp className="size-3.5 text-primary" />
      ) : sorted === "desc" ? (
        <ChevronDown className="size-3.5 text-primary" />
      ) : (
        <ChevronsUpDown className="size-3.5 text-muted-foreground opacity-50" />
      )}
    </button>
  );
}

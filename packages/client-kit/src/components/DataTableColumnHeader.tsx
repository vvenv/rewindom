import { cn } from "@be-water/ui/utils";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";


import type { Column } from "@tanstack/react-table";

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const sorted = column.getIsSorted();
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1 cursor-pointer select-none bg-transparent border-0 p-0",
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

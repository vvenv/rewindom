import { useState, useEffect, useMemo } from "react";


import { Alert, AlertDescription } from "@be-water/ui/alert";
import { Card, CardContent } from "@be-water/ui/card";
import { Checkbox } from "@be-water/ui/checkbox";
import { Spinner } from "@be-water/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@be-water/ui/table";
import { cn } from "@be-water/ui/utils";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type OnChangeFn,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";

import { Pagination } from "./Pagination";

export interface DataTableColumnMeta {
  className?: string;
  headerClassName?: string;
  cellClassName?: string;
  /** 操作列等：收窄列宽并右对齐表头/单元格 */
  align?: "left" | "right";
}

function resolveColumnAlignClass(
  align: DataTableColumnMeta["align"] | undefined,
): string | undefined {
  if (align === "right") {
    // 表格末列收窄：避免 w-full 表格把操作列撑满剩余宽度
    return "w-[1%]";
  }
  return undefined;
}

function wrapColumnAlignEnd(
  align: DataTableColumnMeta["align"] | undefined,
  content: React.ReactNode,
): React.ReactNode {
  if (align !== "right" || content == null) {
    return content;
  }
  return <div className="flex w-full min-w-0 justify-end">{content}</div>;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  emptyHeader?: string;
  loadingMessage?: string;
  onRetry?: () => void;
  pageSize?: number;
  onRowClick?: (row: TData) => void;
  page?: number;
  total?: number;
  pageCount?: number;
  enableRowSelection?: boolean;
  onSelectionChange?: (selectedRows: TData[]) => void;
  isRowSelectable?: (row: TData) => boolean;
  headerActions?: React.ReactNode;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  manualSorting?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  isError,
  error,
  emptyMessage = "暂无数据",
  emptyIcon,
  emptyHeader,
  loadingMessage = "加载中...",
  pageSize,
  onRowClick,
  page,
  total,
  pageCount,
  enableRowSelection = false,
  onSelectionChange,
  isRowSelectable,
  headerActions,
  sorting,
  onSortingChange,
  manualSorting = true,
}: DataTableProps<TData, TValue>) {
  "use no memo";

  const isControlled = page !== undefined;
  const [internalPagination, setInternalPagination] = useState({
    pageIndex: 0,
    pageSize: pageSize ?? 20,
  });
  const [rowSelection, setRowSelection] = useState({});

  const pagination = isControlled
    ? { pageIndex: page, pageSize: pageSize ?? 20 }
    : internalPagination;

  const handlePaginationChange = (
    updater:
      | ((prev: { pageIndex: number; pageSize: number }) => {
          pageIndex: number;
          pageSize: number;
        })
      | { pageIndex: number; pageSize: number },
  ) => {
    if (!isControlled) {
      setInternalPagination(updater);
    }
  };

  // Add checkbox column if row selection is enabled
  const columnsWithSelection = useMemo(() => {
    if (!enableRowSelection) return columns;
    return [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() ? "indeterminate" : false)
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(Boolean(value))
            }
            aria-label="全选"
          />
        ),
        cell: ({ row }) => {
          const isSelectable = isRowSelectable
            ? isRowSelectable(row.original)
            : true;
          return (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
              disabled={!isSelectable}
              aria-label="选择行"
            />
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
      ...columns,
    ];
  }, [enableRowSelection, columns, isRowSelectable]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: columnsWithSelection,
    getCoreRowModel: getCoreRowModel(),
    // Only use client-side pagination if not controlled (server-side pagination)
    ...(!isControlled &&
      pageSize !== undefined && {
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: handlePaginationChange,
        state: { pagination },
      }),
    ...(enableRowSelection && {
      enableRowSelection: true,
      onRowSelectionChange: setRowSelection,
    }),
    ...(sorting !== undefined &&
      onSortingChange && {
        onSortingChange,
        manualSorting,
        enableSortingRemoval: false,
        ...(!manualSorting && { getSortedRowModel: getSortedRowModel() }),
      }),
    state: {
      ...(enableRowSelection && { rowSelection }),
      ...(sorting !== undefined && { sorting }),
      ...(!isControlled && pageSize !== undefined && { pagination }),
    },
  });

  // Notify parent of selection changes
  useEffect(() => {
    if (enableRowSelection && onSelectionChange) {
      const selectedRows = table
        .getFilteredSelectedRowModel()
        .rows.map((row) => row.original);
      onSelectionChange(selectedRows);
    }
  }, [rowSelection, enableRowSelection, onSelectionChange, table]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-5 text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">{loadingMessage}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center py-12">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            {error instanceof Error ? error.message : "加载失败"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        {emptyIcon && (
          <div className="rounded-full bg-muted p-4">
            {emptyIcon}
          </div>
        )}
        <div className="text-center space-y-1">
          {emptyHeader && (
            <p className="text-sm font-medium">{emptyHeader}</p>
          )}
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const tablePageCount = table.getPageCount();
  const currentPage = isControlled
    ? pagination.pageIndex
    : table.getState().pagination.pageIndex;
  const actualPageCount = pageCount ?? tablePageCount;
  const showPagination = pageSize !== undefined;
  // 上方分页器只负责翻页，单页时连翻页都无意义 → 不渲染，控件留给下方主分页器
  const showHeaderPagination = showPagination && actualPageCount > 1;
  const displayTotal = total ?? data.length;

  return (
    <div className="flex flex-col gap-3">
      {(headerActions || showHeaderPagination) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">{headerActions}</div>
          {showHeaderPagination && (
            <Pagination
              currentPage={currentPage}
              pageCount={actualPageCount}
              pageSize={pagination.pageSize}
              total={displayTotal}
              canPrev={
                isControlled ? currentPage > 1 : table.getCanPreviousPage()
              }
              canNext={
                isControlled
                  ? currentPage < actualPageCount
                  : table.getCanNextPage()
              }
              variant="simple"
            />
          )}
        </div>
      )}
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta as
                      | DataTableColumnMeta
                      | undefined;
                    return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        resolveColumnAlignClass(meta?.align),
                        meta?.className,
                        meta?.headerClassName,
                      )}
                    >
                      {wrapColumnAlignEnd(
                        meta?.align,
                        header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            ),
                      )}
                    </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    onRowClick && "cursor-pointer hover:bg-muted",
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as
                      | DataTableColumnMeta
                      | undefined;
                    return (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        resolveColumnAlignClass(meta?.align),
                        meta?.className,
                        meta?.cellClassName,
                      )}
                    >
                      {wrapColumnAlignEnd(
                        meta?.align,
                        flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        ),
                      )}
                    </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {showPagination && (
        <Pagination
          currentPage={currentPage}
          pageCount={actualPageCount}
          pageSize={pagination.pageSize}
          total={displayTotal}
          canPrev={isControlled ? currentPage > 1 : table.getCanPreviousPage()}
          canNext={
            isControlled
              ? currentPage < actualPageCount
              : table.getCanNextPage()
          }
        />
      )}
    </div>
  );
}

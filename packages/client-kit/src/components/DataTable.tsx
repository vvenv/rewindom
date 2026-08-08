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
  createPaginatedRowModel,
  createSortedRowModel,
  flexRender,
  type OnChangeFn,
  type RowData,
  type SortingState,
  sortFns,
  stockFeatures,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";

import { Pagination } from "./Pagination";

export interface DataTableColumnMeta {
  className?: string;
  headerClassName?: string;
  cellClassName?: string;
  /** 操作列等：收窄列宽并右对齐表头/单元格 */
  align?: "left" | "right";
}

/**
 * v9 table features：stockFeatures 提供全部内置 feature，再补上 row model slots
 * （sortedRowModel / paginatedRowModel）与内置 sortFns 注册表。stockFeatures 本身
 * 不含 row model slots，需在此显式补充。columnMeta 类型槽让列 meta 复用
 * DataTableColumnMeta（v9 不再走全局 declaration merging）。
 */
const dataTableFeatures = tableFeatures({
  ...stockFeatures,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns,
  columnMeta: {} as DataTableColumnMeta,
});

export type DataTableFeatures = typeof dataTableFeatures;

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

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[];
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

export function DataTable<TData extends RowData>({
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
}: DataTableProps<TData>) {
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
  const columnsWithSelection = useMemo<
    ColumnDef<DataTableFeatures, TData>[]
  >(() => {
    if (!enableRowSelection) return columns;
    const selectColumn: ColumnDef<DataTableFeatures, TData> = {
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
    };
    return [selectColumn, ...columns];
  }, [enableRowSelection, columns, isRowSelectable]);

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns: columnsWithSelection,
    // v9：core/sorted/paginated row model 总已注册，通过 flag 控制是否走客户端计算。
    // 受控分页（page 传入）或无分页（pageSize 未传）时禁用客户端分页，等价 v8 不挂
    // getPaginationRowModel；manualSorting 保留为 prop 控制客户端排序。
    manualPagination: isControlled || pageSize === undefined,
    ...(!isControlled &&
      pageSize !== undefined && {
        onPaginationChange: handlePaginationChange,
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
          <div className="rounded-full bg-muted p-4">{emptyIcon}</div>
        )}
        <div className="text-center space-y-1">
          {emptyHeader && <p className="text-sm font-medium">{emptyHeader}</p>}
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const tablePageCount = table.getPageCount();
  const currentPage = isControlled
    ? pagination.pageIndex
    : table.state.pagination.pageIndex;
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
                      DataTableColumnMeta | undefined;
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
                  className={cn(onRowClick && "cursor-pointer hover:bg-muted")}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as
                      DataTableColumnMeta | undefined;
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

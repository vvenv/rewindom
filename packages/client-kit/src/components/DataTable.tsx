import { useState, useEffect, useMemo, useRef } from "react";

import { Alert, AlertDescription } from "@rewindom/ui/alert";
import { Card, CardContent } from "@rewindom/ui/card";
import { Checkbox } from "@rewindom/ui/checkbox";
import { Spinner } from "@rewindom/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rewindom/ui/table";
import { cn } from "@rewindom/ui/utils";
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

import { EmptyState } from "./EmptyState";
import { Pagination } from "./Pagination";

import type { LucideIcon } from "lucide-react";

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
  /** 传 lucide 图标组件本身，尺寸交给 EmptyState 统一。 */
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  /** 空态里的主动作，如「新建」按钮。 */
  emptyAction?: React.ReactNode;
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
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
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

  // v9 的 useTable 每次渲染都返回新的包装对象（options 是新对象字面量），
  // 把它放进 effect 依赖会让 effect 每次渲染重跑，进而触发 onSelectionChange
  // → 父级 setState → 本组件重渲染 → 新 table 引用 → effect 再跑，死循环。
  // 这里用 ref 持有最新实例，仅在真正的选择状态 rowSelection 变化时通知父级。
  const tableRef = useRef(table);
  useEffect(() => {
    tableRef.current = table;
  });

  // Notify parent of selection changes
  useEffect(() => {
    if (!enableRowSelection || !onSelectionChange) return;
    const selectedRows = tableRef.current
      .getFilteredSelectedRowModel()
      .rows.map((row) => row.original);
    onSelectionChange(selectedRows);
  }, [rowSelection, enableRowSelection, onSelectionChange]);

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
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  const tablePageCount = table.getPageCount();
  // 受控：page 来自 URL，已是 1-based。非受控（仅 pageSize）：TanStack pageIndex 是 0-based。
  // 列表页应始终传 page（URL 模式）；非受控只留给无 URL 分页的边角 / 测试。
  const currentPage = isControlled
    ? pagination.pageIndex
    : table.state.pagination.pageIndex + 1;
  const actualPageCount = pageCount ?? tablePageCount;
  const showPagination = pageSize !== undefined;
  // 上方分页器只负责翻页，单页时连翻页都无意义 → 不渲染，控件留给下方主分页器
  const showHeaderPagination = showPagination && actualPageCount > 1;
  const displayTotal = total ?? data.length;

  // 非受控时禁止 Pagination 写 URL（否则 search 变了、表格仍读内部态）。
  // 正式列表页请传 page，走 URL 单一模式。
  const localPagingProps = !isControlled
    ? {
        onPageChange: (nextPage: number) => {
          setInternalPagination((prev) => ({
            ...prev,
            pageIndex: nextPage - 1,
          }));
        },
        onPageSizeChange: (size: number) => {
          setInternalPagination({ pageIndex: 0, pageSize: size });
        },
      }
    : {};

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
              {...localPagingProps}
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
          {...localPagingProps}
        />
      )}
    </div>
  );
}

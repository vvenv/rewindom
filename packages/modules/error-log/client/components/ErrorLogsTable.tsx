import { useMemo } from "react";

import { DataTable, DataTableColumnHeader } from "@be-water/client-kit";
import { displayOrEmpty, formatBusinessDate } from "@be-water/shared";
import { Badge, type badgeVariants } from "@be-water/ui/badge";
import { AlertTriangle } from "lucide-react";

import {
  ERROR_LEVEL_COLORS,
  ERROR_LEVEL_LABELS,
  type ErrorLevelType,
  type ErrorLog,
} from "../../shared/index.js";

import { ErrorLogSheet } from "./ErrorLogSheet.js";

import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";

function buildErrorLogColumns(
  showTenantColumn: boolean,
): ColumnDef<ErrorLog>[] {
  return [
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="时间" />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">
          {formatBusinessDate(row.getValue("created_at"))}
        </span>
      ),
    },
    {
      accessorKey: "level",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="级别" />
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const level = row.getValue("level") as ErrorLevelType;
        return (
          <Badge
            variant={ERROR_LEVEL_COLORS[level] as keyof typeof badgeVariants}
          >
            {ERROR_LEVEL_LABELS[level]}
          </Badge>
        );
      },
    },
    {
      accessorKey: "message",
      header: "错误信息",
      enableSorting: false,
      cell: ({ row }) => {
        const message = row.getValue("message") as string;
        return (
          <span className="block max-w-md truncate" title={message}>
            {message}
          </span>
        );
      },
    },
    ...(showTenantColumn
      ? ([
          {
            accessorKey: "tenant_slug",
            header: ({ column }) => (
              <DataTableColumnHeader column={column} title="租户" />
            ),
            enableSorting: true,
            cell: ({ row }) => (
              <span className="font-mono text-muted-foreground">
                {displayOrEmpty(row.getValue("tenant_slug"))}
              </span>
            ),
          },
        ] satisfies ColumnDef<ErrorLog>[])
      : []),
    {
      accessorKey: "username",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="用户" />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {displayOrEmpty(row.getValue("username"))}
        </span>
      ),
    },
    {
      accessorKey: "route",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="路由" />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground">
          {displayOrEmpty(row.getValue("route"))}
        </span>
      ),
    },
    {
      accessorKey: "method",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="方法" />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground">
          {displayOrEmpty(row.getValue("method"))}
        </span>
      ),
    },
    {
      accessorKey: "error_code",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="错误代码" />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground">
          {displayOrEmpty(row.getValue("error_code"))}
        </span>
      ),
    },
  ];
}

export function ErrorLogsTable({
  logs,
  isLoading,
  error,
  page,
  pageSize,
  total,
  pageCount,
  logId,
  sorting,
  onSortingChange,
  onSelectLog,
  onClearSelectedLog,
  showTenantColumn = false,
  allowDelete = false,
}: {
  logs: ErrorLog[];
  isLoading: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  total: number;
  pageCount?: number;
  logId: string | null;
  sorting: SortingState;
  onSortingChange: (updater: Updater<SortingState>) => void;
  onSelectLog: (log: ErrorLog) => void;
  onClearSelectedLog: (open: boolean) => void;
  /** 仅平台控制台开启：租户侧同租户下该列恒等，没有信息量。 */
  showTenantColumn?: boolean;
  /** 详情抽屉是否给出删除入口。删除走租户接口，平台控制台不能开。 */
  allowDelete?: boolean;
}) {
  const columns = useMemo(
    () => buildErrorLogColumns(showTenantColumn),
    [showTenantColumn],
  );
  const selectedLog = logs.find((log) => log.id === logId) ?? null;

  return (
    <>
      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading && logs.length === 0}
        isError={Boolean(error) && logs.length === 0}
        error={error}
        emptyMessage="暂无错误日志"
        emptyIcon={<AlertTriangle className="size-8 text-muted-foreground" />}
        loadingMessage="加载中..."
        pageSize={pageSize}
        page={page}
        total={total}
        pageCount={pageCount}
        onRowClick={onSelectLog}
        sorting={sorting}
        onSortingChange={onSortingChange}
      />
      <ErrorLogSheet
        open={Boolean(selectedLog)}
        onOpenChange={onClearSelectedLog}
        log={selectedLog}
        allowDelete={allowDelete}
      />
    </>
  );
}

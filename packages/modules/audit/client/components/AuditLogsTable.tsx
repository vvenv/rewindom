import { useMemo } from "react";

import { DataTable, DataTableColumnHeader } from "@be-water/client-kit";
import { displayOrEmpty, formatBusinessDate } from "@be-water/shared";
import { ScrollText } from "lucide-react";

import { AUDIT_ACTION_LABELS, type PlatformAuditLog } from "../../shared/index.js";

import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";

function buildAuditLogColumns(): ColumnDef<PlatformAuditLog>[] {
  return [
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="时间" />
      ),
      enableSorting: true,
      meta: { cellClassName: "text-muted-foreground tabular-nums" },
      cell: ({ row }) => formatBusinessDate(row.getValue("created_at")),
    },
    {
      accessorKey: "tenant_slug",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="租户" />
      ),
      enableSorting: true,
      meta: { cellClassName: "font-mono text-muted-foreground" },
      cell: ({ row }) => displayOrEmpty(row.getValue("tenant_slug")),
    },
    {
      accessorKey: "action",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="操作" />
      ),
      enableSorting: true,
      cell: ({ row }) =>
        AUDIT_ACTION_LABELS[
          row.getValue("action") as keyof typeof AUDIT_ACTION_LABELS
        ] || row.getValue("action"),
    },
    {
      accessorKey: "username",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="账号" />
      ),
      enableSorting: true,
      meta: { cellClassName: "text-muted-foreground" },
      cell: ({ row }) => displayOrEmpty(row.getValue("username")),
    },
    {
      accessorKey: "resource",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="资源" />
      ),
      enableSorting: true,
      meta: { cellClassName: "text-muted-foreground" },
      cell: ({ row }) => displayOrEmpty(row.getValue("resource")),
    },
    {
      accessorKey: "details",
      header: "详情",
      enableSorting: false,
      meta: {
        cellClassName: "whitespace-break-spaces text-muted-foreground",
      },
      cell: ({ row }) => displayOrEmpty(row.getValue("details")),
    },
  ];
}

export function AuditLogsTable({
  logs,
  isLoading,
  error,
  page,
  pageSize,
  total,
  pageCount,
  sorting,
  onSortingChange,
}: {
  logs: PlatformAuditLog[];
  isLoading: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  total: number;
  pageCount?: number;
  sorting: SortingState;
  onSortingChange: (updater: Updater<SortingState>) => void;
}) {
  const columns = useMemo(() => buildAuditLogColumns(), []);

  return (
    <DataTable
      columns={columns}
      data={logs}
      isLoading={isLoading && logs.length === 0}
      isError={Boolean(error) && logs.length === 0}
      error={error}
      emptyMessage="暂无审计日志"
      emptyIcon={<ScrollText className="size-8 text-muted-foreground" />}
      loadingMessage="加载中..."
      pageSize={pageSize}
      page={page}
      total={total}
      pageCount={pageCount}
      sorting={sorting}
      onSortingChange={onSortingChange}
    />
  );
}

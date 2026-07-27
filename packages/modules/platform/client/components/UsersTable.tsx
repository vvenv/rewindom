import { useMemo, type ComponentType  } from "react";

import { DataTable, DataTableColumnHeader } from "@be-water/client-kit";
import { formatLoginIdentifier, formatBusinessDate, formatBusinessDateOrTimeAgo  } from "@be-water/shared";
import { Alert, AlertDescription } from "@be-water/ui/alert";
import { Spinner } from "@be-water/ui/spinner";
import { cn } from "@be-water/ui/utils";

import { type PlatformUserSummary } from "../../shared/index.js";
import { userRoleBadgeSlot } from "../shell/platform-widget-slots.js";

import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";

function buildPlatformUserColumns(
  RoleBadge: ComponentType<{ isSystemAdmin: boolean }> | null,
): ColumnDef<PlatformUserSummary>[] {
  return [
  {
    accessorKey: "tenant_slug",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="租户" />
    ),
    enableSorting: true,
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.tenant_name}（{row.original.tenant_slug}）
      </span>
    ),
  },
  {
    accessorKey: "username",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="登录账号" />
    ),
    enableSorting: true,
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {formatLoginIdentifier(row.original.username, row.original.tenant_slug)}
      </span>
    ),
  },
  {
    accessorKey: "is_system_admin",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="类型" />
    ),
    enableSorting: true,
    cell: ({ row }) =>
      RoleBadge ? (
        <RoleBadge isSystemAdmin={row.original.is_system_admin} />
      ) : row.original.is_system_admin ? (
        "系统管理员"
      ) : (
        "普通用户"
      ),
  },
  {
    accessorKey: "enabled",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="状态" />
    ),
    enableSorting: true,
    cell: ({ row }) => (
      <span
        className={cn(
          "inline-flex rounded-full px-2 py-0.5 text-xs",
          row.original.enabled
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : "bg-muted text-muted-foreground",
        )}
      >
        {row.original.enabled ? "启用" : "禁用"}
      </span>
    ),
  },
  {
    accessorKey: "last_login_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="最近登录" />
    ),
    enableSorting: true,
    meta: { cellClassName: "text-muted-foreground" },
    cell: ({ row }) =>
      row.original.last_login_at
        ? formatBusinessDateOrTimeAgo(row.original.last_login_at)
        : "从未登录",
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="创建时间" />
    ),
    enableSorting: true,
    meta: { cellClassName: "text-muted-foreground tabular-nums" },
    cell: ({ row }) => formatBusinessDate(row.original.created_at),
  },
  ];
}

export function UsersTable({
  users,
  isLoading,
  error,
  page,
  pageSize,
  total,
  pageCount,
  sorting,
  onSortingChange,
}: {
  users: PlatformUserSummary[];
  isLoading: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  sorting: SortingState;
  onSortingChange: (updater: Updater<SortingState>) => void;
}) {
  const RoleBadge = userRoleBadgeSlot.useSlot();
  const columns = useMemo(() => buildPlatformUserColumns(RoleBadge), [RoleBadge]);

  if (isLoading && users.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertDescription>加载失败</AlertDescription>
      </Alert>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={users}
      page={page}
      pageSize={pageSize}
      total={total}
      pageCount={pageCount}
      sorting={sorting}
      onSortingChange={onSortingChange}
    />
  );
}

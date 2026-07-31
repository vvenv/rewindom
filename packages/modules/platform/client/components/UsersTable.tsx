import { useMemo, type ComponentType  } from "react";

import { DataTable, DataTableColumnHeader } from "@be-water/client-kit";
import { formatLoginIdentifier, formatBusinessDate, formatBusinessDateOrTimeAgo  } from "@be-water/shared";
import { Alert, AlertDescription } from "@be-water/ui/alert";
import { Spinner } from "@be-water/ui/spinner";
import { cn } from "@be-water/ui/utils";
import { useTranslation } from "react-i18next";


import { type PlatformUserSummary } from "../../shared/index.js";
import { userRoleBadgeSlot } from "../shell/platform-widget-slots.js";

import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";
import type { TFunction } from "i18next";

function buildPlatformUserColumns(
  t: TFunction<"platform">,
  RoleBadge: ComponentType<{ isSystemAdmin: boolean }> | null,
): ColumnDef<PlatformUserSummary>[] {
  return [
  {
    accessorKey: "tenant_slug",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("users.table.tenant")} />
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
      <DataTableColumnHeader column={column} title={t("users.table.loginAccount")} />
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
      <DataTableColumnHeader column={column} title={t("users.table.type")} />
    ),
    enableSorting: true,
    cell: ({ row }) =>
      RoleBadge ? (
        <RoleBadge isSystemAdmin={row.original.is_system_admin} />
      ) : row.original.is_system_admin ? (
        t("users.table.systemAdmin")
      ) : (
        t("users.table.regularUser")
      ),
  },
  {
    accessorKey: "enabled",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("users.table.status")} />
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
        {row.original.enabled ? t("common:enabled") : t("common:disabled")}
      </span>
    ),
  },
  {
    accessorKey: "last_login_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("users.table.lastLogin")} />
    ),
    enableSorting: true,
    meta: { cellClassName: "text-muted-foreground" },
    cell: ({ row }) =>
      row.original.last_login_at
        ? formatBusinessDateOrTimeAgo(row.original.last_login_at)
        : t("users.table.neverLoggedIn"),
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("users.table.createdAt")} />
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
  const { t } = useTranslation(["platform", "common"]);
  const RoleBadge = userRoleBadgeSlot.useSlot();
  const columns = useMemo(
    () => buildPlatformUserColumns(t, RoleBadge),
    [RoleBadge, t],
  );

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
        <AlertDescription>{t("common:loadFailed")}</AlertDescription>
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

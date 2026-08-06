import { useMemo } from "react";

import { DataTable, DataTableColumnHeader } from "@be-water/client-kit";
import { displayOrEmpty, formatBusinessDate } from "@be-water/shared";
import { ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";

import { type AuditLog } from "../../shared/index.js";
import { translateAuditAction } from "../lib/audit-action-i18n.js";
import { translateAuditDetail } from "../lib/audit-detail-i18n.js";

import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";
import type { TFunction } from "i18next";

function buildAuditLogColumns(
  showTenantColumn: boolean,
  t: TFunction,
): ColumnDef<AuditLog>[] {
  return [
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.time")} />
      ),
      enableSorting: true,
      meta: { cellClassName: "text-muted-foreground tabular-nums" },
      cell: ({ row }) => formatBusinessDate(row.getValue("created_at")),
    },
    ...(showTenantColumn
      ? ([
          {
            accessorKey: "tenant_slug",
            header: ({ column }) => (
              <DataTableColumnHeader column={column} title={t("table.tenant")} />
            ),
            enableSorting: true,
            meta: { cellClassName: "font-mono text-muted-foreground" },
            cell: ({ row }) => displayOrEmpty(row.getValue("tenant_slug")),
          },
        ] satisfies ColumnDef<AuditLog>[])
      : []),
    {
      accessorKey: "action",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.action")} />
      ),
      enableSorting: true,
      cell: ({ row }) =>
        translateAuditAction(t, String(row.getValue("action"))),
    },
    {
      accessorKey: "username",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.username")} />
      ),
      enableSorting: true,
      meta: { cellClassName: "text-muted-foreground" },
      cell: ({ row }) => displayOrEmpty(row.getValue("username")),
    },
    {
      accessorKey: "resource",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.resource")} />
      ),
      enableSorting: true,
      meta: { cellClassName: "text-muted-foreground" },
      cell: ({ row }) => displayOrEmpty(row.getValue("resource")),
    },
    {
      id: "details",
      accessorFn: (row) =>
        translateAuditDetail(
          t,
          row.detail_key,
          row.detail_params,
          row.details,
        ),
      header: t("table.details"),
      enableSorting: false,
      meta: {
        cellClassName: "whitespace-break-spaces text-muted-foreground",
      },
      cell: ({ getValue }) => displayOrEmpty(getValue<string>()),
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
  showTenantColumn = false,
}: {
  logs: AuditLog[];
  isLoading: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  total: number;
  pageCount?: number;
  sorting: SortingState;
  onSortingChange: (updater: Updater<SortingState>) => void;
  showTenantColumn?: boolean;
}) {
  // 详情模板分布在各业务 ns；t(..., { ns }) 可解析已 register 的任意命名空间
  const { t } = useTranslation([
    "audit",
    "notes",
    "todos",
    "user",
    "rbac",
    "platform",
    "billing",
    "error-log",
    "background-job",
    "marketing",
  ]);
  const columns = useMemo(
    () => buildAuditLogColumns(showTenantColumn, t),
    [showTenantColumn, t],
  );

  return (
    <DataTable
      columns={columns}
      data={logs}
      isLoading={isLoading && logs.length === 0}
      isError={Boolean(error) && logs.length === 0}
      error={error}
      emptyMessage={t("table.empty")}
      emptyIcon={<ScrollText className="size-8 text-muted-foreground" />}
      loadingMessage={t("table.loading")}
      pageSize={pageSize}
      page={page}
      total={total}
      pageCount={pageCount}
      sorting={sorting}
      onSortingChange={onSortingChange}
    />
  );
}

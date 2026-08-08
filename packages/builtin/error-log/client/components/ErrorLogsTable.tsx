import { useMemo } from "react";

import {
  DataTable,
  DataTableColumnHeader,
  type DataTableFeatures,
} from "@be-water/client-kit";
import {
  displayOrEmpty,
  formatBusinessDate,
  formatTenantDisplayLabel,
} from "@be-water/shared";
import { Badge, type badgeVariants } from "@be-water/ui/badge";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  ERROR_LEVEL_COLORS,
  type ErrorLevelType,
  type ErrorLog,
} from "../../shared/index.js";
import { translateErrorLevel } from "../lib/error-level-i18n.js";

import { ErrorLogSheet } from "./ErrorLogSheet.js";

import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";
import type { TFunction } from "i18next";

function buildErrorLogColumns(
  showTenantColumn: boolean,
  t: TFunction,
): ColumnDef<DataTableFeatures, ErrorLog>[] {
  return [
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.time")} />
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
        <DataTableColumnHeader column={column} title={t("table.level")} />
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const level = row.getValue("level") as ErrorLevelType;
        return (
          <Badge
            variant={ERROR_LEVEL_COLORS[level] as keyof typeof badgeVariants}
          >
            {translateErrorLevel(t, level)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "message",
      header: t("table.message"),
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
              <DataTableColumnHeader
                column={column}
                title={t("table.tenant")}
              />
            ),
            enableSorting: true,
            cell: ({ row }) => (
              <span className="text-muted-foreground">
                {formatTenantDisplayLabel(
                  row.original.tenant_name,
                  row.original.tenant_slug,
                )}
              </span>
            ),
          },
        ] satisfies ColumnDef<DataTableFeatures, ErrorLog>[])
      : []),
    {
      accessorKey: "username",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.user")} />
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
        <DataTableColumnHeader column={column} title={t("table.route")} />
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
        <DataTableColumnHeader column={column} title={t("table.method")} />
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
        <DataTableColumnHeader column={column} title={t("table.errorCode")} />
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
  showTenantColumn?: boolean;
  allowDelete?: boolean;
}) {
  const { t } = useTranslation("error-log");
  const columns = useMemo(
    () => buildErrorLogColumns(showTenantColumn, t),
    [showTenantColumn, t],
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
        emptyMessage={t("table.empty")}
        emptyIcon={<AlertTriangle className="size-8 text-muted-foreground" />}
        loadingMessage={t("table.loading")}
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

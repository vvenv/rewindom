import { useMemo } from "react";

import {
  DataTable,
  DataTableColumnHeader,
  type DataTableFeatures,
} from "@rewindom/client-kit";
import {
  displayOrEmpty,
  formatBusinessDate,
  formatTenantDisplayLabel,
} from "@rewindom/shared";
import { Badge } from "@rewindom/ui/badge";
import { Timer } from "lucide-react";
import { useTranslation } from "react-i18next";

import { type SlowRequestLogItem } from "../../shared/index.js";

import { SlowRequestLogSheet } from "./SlowRequestLogSheet.js";

import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";
import type { TFunction } from "i18next";

function DurationBadge({ ms }: { ms: number }) {
  const variant = ms >= 2000 ? "destructive" : "secondary";

  return (
    <Badge variant={variant} className="font-mono tabular-nums">
      {ms}ms
    </Badge>
  );
}

function buildSlowRequestColumns(
  t: TFunction,
): ColumnDef<DataTableFeatures, SlowRequestLogItem>[] {
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
      accessorKey: "duration_ms",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.duration")} />
      ),
      enableSorting: true,
      cell: ({ row }) => <DurationBadge ms={row.getValue("duration_ms")} />,
    },
    {
      accessorKey: "method",
      header: t("table.method"),
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground">
          {row.getValue("method")}
        </span>
      ),
    },
    {
      accessorKey: "status_code",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.status")} />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">
          {row.getValue("status_code")}
        </span>
      ),
    },
    {
      accessorKey: "route",
      header: t("table.route"),
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground">
          {displayOrEmpty(row.getValue("route"))}
        </span>
      ),
    },
    {
      accessorKey: "tenant_slug",
      header: t("table.tenant"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatTenantDisplayLabel(
            row.original.tenant_name,
            row.original.tenant_slug,
          )}
        </span>
      ),
    },
  ];
}

export function SlowRequestLogsTable({
  logs,
  isLoading,
  error,
  page,
  pageSize,
  total,
  pageCount,
  sorting,
  onSortingChange,
  logId,
  onSelectLog,
  onClearSelectedLog,
  isFiltered = false,
}: {
  logs: SlowRequestLogItem[];
  isLoading: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  total: number;
  pageCount?: number;
  sorting: SortingState;
  onSortingChange: (updater: Updater<SortingState>) => void;
  logId: string | null;
  onSelectLog: (log: SlowRequestLogItem) => void;
  onClearSelectedLog: (open: boolean) => void;
  isFiltered?: boolean;
}) {
  const { t } = useTranslation("slow-request");
  const columns = useMemo(() => buildSlowRequestColumns(t), [t]);
  const selectedLog = logs.find((log) => log.id === logId) ?? null;

  return (
    <>
      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        isError={Boolean(error)}
        error={error}
        emptyIcon={Timer}
        emptyTitle={isFiltered ? t("table.emptyFiltered") : t("table.empty")}
        emptyDescription={
          isFiltered ? t("table.emptyFilteredHint") : t("table.emptyHint")
        }
        loadingMessage={t("table.loading")}
        pageSize={pageSize}
        page={page}
        total={total}
        pageCount={pageCount}
        onRowClick={onSelectLog}
        sorting={sorting}
        onSortingChange={onSortingChange}
      />
      <SlowRequestLogSheet
        open={Boolean(selectedLog)}
        onOpenChange={onClearSelectedLog}
        log={selectedLog}
      />
    </>
  );
}

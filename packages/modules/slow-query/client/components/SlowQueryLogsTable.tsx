import { useMemo } from "react";

import { DataTable, DataTableColumnHeader } from "@be-water/client-kit";
import { displayOrEmpty, formatBusinessDate } from "@be-water/shared";
import { Badge } from "@be-water/ui/badge";
import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

import { type SlowQueryLogItem } from "../../shared/index.js";

import { SlowQueryLogSheet } from "./SlowQueryLogSheet.js";

import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";
import type { TFunction } from "i18next";

function DurationBadge({ ms }: { ms: number }) {
  const variant =
    ms >= 1000 ? "destructive" : ms >= 500 ? "secondary" : "secondary";

  return (
    <Badge variant={variant} className="font-mono tabular-nums">
      {ms}ms
    </Badge>
  );
}

function buildSlowQueryColumns(t: TFunction): ColumnDef<SlowQueryLogItem>[] {
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
      accessorKey: "query",
      header: t("table.query"),
      cell: ({ row }) => {
        const query = row.getValue("query") as string;
        return (
          <span
            className="block max-w-md truncate font-mono text-xs"
            title={query}
          >
            {query}
          </span>
        );
      },
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
        <span className="font-mono text-muted-foreground">
          {displayOrEmpty(row.getValue("tenant_slug"))}
        </span>
      ),
    },
    {
      accessorKey: "source",
      header: t("table.source"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("source")}</span>
      ),
    },
  ];
}

export function SlowQueryLogsTable({
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
}: {
  logs: SlowQueryLogItem[];
  isLoading: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  total: number;
  pageCount?: number;
  sorting: SortingState;
  onSortingChange: (updater: Updater<SortingState>) => void;
  logId: string | null;
  onSelectLog: (log: SlowQueryLogItem) => void;
  onClearSelectedLog: (open: boolean) => void;
}) {
  const { t } = useTranslation("slow-query");
  const columns = useMemo(() => buildSlowQueryColumns(t), [t]);
  const selectedLog = logs.find((log) => log.id === logId) ?? null;

  return (
    <>
      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        isError={Boolean(error)}
        error={error}
        emptyMessage={t("table.empty")}
        emptyIcon={<Activity className="size-8 text-muted-foreground" />}
        loadingMessage={t("table.loading")}
        pageSize={pageSize}
        page={page}
        total={total}
        pageCount={pageCount}
        onRowClick={onSelectLog}
        sorting={sorting}
        onSortingChange={onSortingChange}
      />
      <SlowQueryLogSheet
        open={Boolean(selectedLog)}
        onOpenChange={onClearSelectedLog}
        log={selectedLog}
      />
    </>
  );
}

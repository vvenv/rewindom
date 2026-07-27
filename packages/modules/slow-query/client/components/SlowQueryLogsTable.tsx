import { useMemo } from "react";


import { DataTable, DataTableColumnHeader  } from "@be-water/client-kit";
import { displayOrEmpty, formatBusinessDate } from "@be-water/shared";
import { Badge } from "@be-water/ui/badge";
import { Activity } from "lucide-react";

import { type SlowQueryLogItem } from "../../shared/index.js";

import { SlowQueryLogSheet } from "./SlowQueryLogSheet.js";

import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";

function DurationBadge({ ms }: { ms: number }) {
  const variant =
    ms >= 1000 ? "destructive" : ms >= 500 ? "secondary" : "secondary";

  return (
    <Badge variant={variant} className="font-mono tabular-nums">
      {ms}ms
    </Badge>
  );
}

const SLOW_QUERY_COLUMNS: ColumnDef<SlowQueryLogItem>[] = [
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
    accessorKey: "duration_ms",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="耗时" />
    ),
    enableSorting: true,
    cell: ({ row }) => <DurationBadge ms={row.getValue("duration_ms")} />,
  },
  {
    accessorKey: "query",
    header: "SQL",
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
    header: "路由",
    cell: ({ row }) => (
      <span className="font-mono text-muted-foreground">
        {displayOrEmpty(row.getValue("route"))}
      </span>
    ),
  },
  {
    accessorKey: "tenant_slug",
    header: "租户",
    cell: ({ row }) => (
      <span className="font-mono text-muted-foreground">
        {displayOrEmpty(row.getValue("tenant_slug"))}
      </span>
    ),
  },
  {
    accessorKey: "source",
    header: "来源",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.getValue("source")}</span>
    ),
  },
];

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
  const columns = useMemo(() => SLOW_QUERY_COLUMNS, []);
  const selectedLog = logs.find((log) => log.id === logId) ?? null;

  return (
    <>
      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        isError={Boolean(error)}
        error={error}
        emptyMessage="暂无慢查询日志"
        emptyIcon={<Activity className="size-8 text-muted-foreground" />}
        loadingMessage="加载中..."
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

import { ErrorLogFilters } from "../components/ErrorLogFilters.js";
import { ErrorLogsTable } from "../components/ErrorLogsTable.js";
import { usePlatformErrorLogs } from "../hooks/usePlatformErrorLogs.js";
import { usePlatformErrorLogsPage } from "../hooks/usePlatformErrorLogsPage.js";

export function ErrorLogs() {
  const {
    filters,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    logId,
    updateFilters,
    handleSortingChange,
    selectLog,
    clearSelectedLog,
  } = usePlatformErrorLogsPage();

  const {
    data: logs,
    isLoading,
    error,
  } = usePlatformErrorLogs(
    filters.level,
    undefined,
    filters.q,
    filters.tenant_slug,
    filters.start_date,
    filters.end_date,
    page,
    pageSize,
    sortBy,
    sortDir,
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground hidden sm:block">
        跨租户错误日志（只读）
      </p>

      <div className="flex flex-col gap-4">
        <ErrorLogFilters
          filters={filters}
          onFiltersChange={updateFilters}
        />

        <ErrorLogsTable
          logs={logs?.items ?? []}
          isLoading={isLoading}
          error={error}
          page={page}
          pageSize={pageSize}
          total={logs?.total ?? 0}
          pageCount={logs?.page_count}
          logId={logId}
          onSelectLog={(log) => selectLog(log.id)}
          onClearSelectedLog={clearSelectedLog}
          sorting={sorting}
          onSortingChange={handleSortingChange}
        />
      </div>
    </div>
  );
}

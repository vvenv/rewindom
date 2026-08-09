import { hasActiveFilters } from "@be-water/client-kit/lib/list-url-params";
import { useTranslation } from "react-i18next";

import { ErrorLogFilters } from "../components/ErrorLogFilters.js";
import { ErrorLogsTable } from "../components/ErrorLogsTable.js";
import { usePlatformErrorLogs } from "../hooks/usePlatformErrorLogs.js";
import { usePlatformErrorLogsPage } from "../hooks/usePlatformErrorLogsPage.js";

export function ErrorLogs() {
  const { t } = useTranslation("error-log");
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
        {t("platform.description")}
      </p>

      <div className="flex flex-col gap-4">
        <ErrorLogFilters
          filters={filters}
          onFiltersChange={updateFilters}
          showTenantFilter
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
          showTenantColumn
          isFiltered={hasActiveFilters(filters)}
        />
      </div>
    </div>
  );
}

import { hasActiveFilters } from "@rewindom/client-kit/lib/list-url-params";
import { useTranslation } from "react-i18next";

import { SlowQueryLogFilters } from "../components/SlowQueryLogFilters.js";
import { SlowQueryLogsTable } from "../components/SlowQueryLogsTable.js";
import { usePlatformSlowQueryLogs } from "../hooks/usePlatformSlowQueryLogs.js";
import { usePlatformSlowQueryLogsPage } from "../hooks/usePlatformSlowQueryLogsPage.js";

export function SlowQueryLogs() {
  const { t } = useTranslation("slow-query");
  const {
    filters,
    page,
    pageSize,
    sortBy,
    sortOrder,
    sorting,
    logId,
    updateFilters,
    handleSortingChange,
    selectLog,
    clearSelectedLog,
  } = usePlatformSlowQueryLogsPage();

  const {
    data: logs,
    isLoading,
    error,
  } = usePlatformSlowQueryLogs(
    filters.route,
    filters.fingerprint,
    filters.min_duration_ms ? Number(filters.min_duration_ms) : undefined,
    filters.source,
    filters.tenant_slug,
    filters.start_date,
    filters.end_date,
    page,
    pageSize,
    sortBy,
    sortOrder,
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="hidden text-muted-foreground sm:block">
        {t("page.description")}
      </p>

      <SlowQueryLogFilters
        filters={filters}
        onFiltersChange={updateFilters}
        showTenantFilter
      />

      <SlowQueryLogsTable
        logs={logs?.items ?? []}
        isLoading={isLoading}
        error={error}
        page={page}
        pageSize={pageSize}
        total={logs?.total ?? 0}
        pageCount={logs?.page_count}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        logId={logId}
        onSelectLog={(log) => selectLog(log.id)}
        onClearSelectedLog={clearSelectedLog}
        isFiltered={hasActiveFilters(filters)}
      />
    </div>
  );
}

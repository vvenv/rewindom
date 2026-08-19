import { hasActiveFilters } from "@rewindom/client-kit/lib/list-url-params";
import { useTranslation } from "react-i18next";

import { SlowRequestLogFilters } from "../components/SlowRequestLogFilters.js";
import { SlowRequestLogsTable } from "../components/SlowRequestLogsTable.js";
import { usePlatformSlowRequestLogs } from "../hooks/usePlatformSlowRequestLogs.js";
import { usePlatformSlowRequestLogsPage } from "../hooks/usePlatformSlowRequestLogsPage.js";

export function SlowRequestLogs() {
  const { t } = useTranslation("slow-request");
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
  } = usePlatformSlowRequestLogsPage();

  const {
    data: logs,
    isLoading,
    error,
  } = usePlatformSlowRequestLogs(
    filters.route,
    filters.method,
    filters.min_duration_ms ? Number(filters.min_duration_ms) : undefined,
    filters.status_code ? Number(filters.status_code) : undefined,
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
      <p className="hidden text-muted-foreground sm:block">
        {t("page.description")}
      </p>

      <SlowRequestLogFilters
        filters={filters}
        onFiltersChange={updateFilters}
        showTenantFilter
      />

      <SlowRequestLogsTable
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

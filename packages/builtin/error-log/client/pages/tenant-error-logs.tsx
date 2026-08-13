import { PageLayout, usePermissions } from "@rewindom/client-kit";
import { hasActiveFilters } from "@rewindom/client-kit/lib/list-url-params";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ErrorLogCleanupAction } from "../components/ErrorLogCleanupAction.js";
import { ErrorLogFilters } from "../components/ErrorLogFilters.js";
import { ErrorLogsTable } from "../components/ErrorLogsTable.js";
import { useErrorLogs } from "../hooks/useErrorLogs.js";
import { useErrorLogsPage } from "../hooks/useErrorLogsPage.js";

export function TenantErrorLogs() {
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
  } = useErrorLogsPage();

  const { hasPermission } = usePermissions();
  const canManage = hasPermission("error_logs.manage");

  const {
    data: logs,
    isLoading,
    error,
  } = useErrorLogs(
    filters.level,
    undefined,
    filters.q,
    filters.start_date,
    filters.end_date,
    page,
    pageSize,
    sortBy,
    sortDir,
  );

  return (
    <PageLayout
      icon={AlertTriangle}
      title={t("page.title")}
      description={t("page.description")}
      action={canManage ? <ErrorLogCleanupAction /> : null}
    >
      <div className="flex flex-col gap-4">
        <ErrorLogFilters filters={filters} onFiltersChange={updateFilters} />

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
          allowDelete
          isFiltered={hasActiveFilters(filters)}
        />
      </div>
    </PageLayout>
  );
}

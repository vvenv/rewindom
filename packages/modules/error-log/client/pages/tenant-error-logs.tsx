import { PageLayout, usePermissions } from "@be-water/client-kit";
import { AlertTriangle } from "lucide-react";

import { ErrorLogCleanupAction } from "../components/ErrorLogCleanupAction.js";
import { ErrorLogFilters } from "../components/ErrorLogFilters.js";
import { ErrorLogsTable } from "../components/ErrorLogsTable.js";
import { useErrorLogs } from "../hooks/useErrorLogs.js";
import { useErrorLogsPage } from "../hooks/useErrorLogsPage.js";

export function TenantErrorLogs() {
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
      title="错误日志"
      description="本租户内的服务端报错记录，点击任意一行查看堆栈与请求上下文"
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
        />
      </div>
    </PageLayout>
  );
}

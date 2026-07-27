import { AuditLogFilters } from "../components/AuditLogFilters.js";
import { AuditLogsTable } from "../components/AuditLogsTable.js";
import { usePlatformAuditLogs } from "../hooks/usePlatformAuditLogs.js";
import { usePlatformAuditLogsPage } from "../hooks/usePlatformAuditLogsPage.js";

export function AuditLogs() {
  const {
    filters,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    updateFilters,
    updateParam,
    resetFilters,
    handleSortingChange,
  } = usePlatformAuditLogsPage();

  const {
    data: logs,
    isLoading,
    error,
  } = usePlatformAuditLogs(
    filters.action,
    filters.username,
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
        跨租户审计日志（只读）
      </p>

      <div className="flex flex-col gap-4">
        <AuditLogFilters
          filters={filters}
          onTenantChange={(slug) =>
            updateParam("tenant_slug", slug ?? undefined)
          }
          onUsernameChange={(username) => updateParam("username", username)}
          onFiltersChange={updateFilters}
          onReset={resetFilters}
        />

        <AuditLogsTable
          logs={logs?.items ?? []}
          isLoading={isLoading}
          error={error}
          page={page}
          pageSize={pageSize}
          total={logs?.total ?? 0}
          pageCount={logs?.page_count}
          sorting={sorting}
          onSortingChange={handleSortingChange}
        />
      </div>
    </div>
  );
}

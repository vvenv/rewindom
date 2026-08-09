import { PageLayout } from "@be-water/client-kit";
import { hasActiveFilters } from "@be-water/client-kit/lib/list-url-params";
import { ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AuditLogFilters } from "../components/AuditLogFilters.js";
import { AuditLogsTable } from "../components/AuditLogsTable.js";
import { useAuditLogs } from "../hooks/useAuditLogs.js";
import { useAuditLogsPage } from "../hooks/useAuditLogsPage.js";

export function TenantAuditLogs() {
  const { t } = useTranslation("audit");
  const {
    filters,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    updateFilters,
    updateUsername,
    resetFilters,
    handleSortingChange,
  } = useAuditLogsPage();

  const {
    data: logs,
    isLoading,
    error,
  } = useAuditLogs(
    filters.action,
    filters.username,
    filters.start_date,
    filters.end_date,
    page,
    pageSize,
    sortBy,
    sortDir,
  );

  return (
    <PageLayout
      icon={ScrollText}
      title={t("page.title")}
      description={t("page.description")}
    >
      <div className="flex flex-col gap-4">
        <AuditLogFilters
          filters={filters}
          onUsernameChange={updateUsername}
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
          isFiltered={hasActiveFilters(filters)}
        />
      </div>
    </PageLayout>
  );
}

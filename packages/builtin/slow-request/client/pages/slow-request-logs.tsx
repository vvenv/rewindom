import { hasActiveFilters } from "@rewindom/client-kit/lib/list-url-params";
import { Card, CardContent, CardHeader, CardTitle } from "@rewindom/ui/card";
import { useTranslation } from "react-i18next";

import { SlowRequestBarChart } from "../components/SlowRequestBarChart.js";
import { SlowRequestLogFilters } from "../components/SlowRequestLogFilters.js";
import { SlowRequestLogsTable } from "../components/SlowRequestLogsTable.js";
import { usePlatformSlowRequestLogs } from "../hooks/usePlatformSlowRequestLogs.js";
import { usePlatformSlowRequestLogsPage } from "../hooks/usePlatformSlowRequestLogsPage.js";
import { usePlatformSlowRequestStats } from "../hooks/usePlatformSlowRequestStats.js";
import {
  buildRouteChartRows,
  formatPlatformCountLabel,
  formatPlatformDuration,
  formatPlatformDurationLabel,
} from "../lib/slow-request-dashboard.js";

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

  const { data: stats, isLoading: statsLoading } = usePlatformSlowRequestStats({
    startDate: filters.start_date,
    endDate: filters.end_date,
    tenantSlug: filters.tenant_slug,
  });

  const chartRows = buildRouteChartRows(stats?.by_route);

  return (
    <div className="flex flex-col gap-4">
      <p className="hidden text-muted-foreground md:block">
        {t("page.description")}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t("stats.total")}
          value={formatPlatformCountLabel(stats?.total_count, statsLoading)}
        />
        <StatCard
          title={t("stats.avg")}
          value={formatPlatformDurationLabel(
            stats?.avg_duration_ms,
            statsLoading,
          )}
        />
        <StatCard
          title={t("stats.p95")}
          value={formatPlatformDurationLabel(
            stats?.p95_duration_ms,
            statsLoading,
          )}
        />
        <StatCard
          title={t("stats.max")}
          value={formatPlatformDurationLabel(
            stats?.duration_max,
            statsLoading,
          )}
        />
      </div>

      <SlowRequestBarChart
        title={t("stats.byRoute")}
        data={chartRows}
        valueFormatter={formatPlatformDuration}
        chartLabel={t("chart.avgDuration")}
        isLoading={statsLoading}
      />

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

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-2xl tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

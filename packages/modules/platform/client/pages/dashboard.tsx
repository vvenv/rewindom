import { useMemo } from "react";


import { DateTimeRangePicker } from "@be-water/client-kit";
import { Alert, AlertDescription } from "@be-water/ui/alert";
import { useTranslation } from "react-i18next";

import { SlowQueryBarChart } from "../../../slow-query/client/components/SlowQueryBarChart.js";
import { usePlatformSlowQueryStats } from "../../../slow-query/client/hooks/usePlatformSlowQueryStats.js";
import {
  buildFingerprintChartRows,
  buildRouteChartRows,
  formatPlatformCountLabel,
  formatPlatformDuration,
  formatPlatformDurationLabel,
} from "../../../slow-query/client/lib/slow-query-dashboard.js";
import { MetricCard } from "../components/MetricCard.js";
import { usePlatformDashboardPage } from "../hooks/usePlatformDashboardPage.js";

export function Dashboard() {
  const { t } = useTranslation("platform");
  const { dateRange, dateParams, handleDateRangeChange } =
    usePlatformDashboardPage();

  const {
    data: stats,
    isLoading,
    error,
  } = usePlatformSlowQueryStats({
    startDate: dateParams?.start_date,
    endDate: dateParams?.end_date,
  });

  const routeChart = useMemo(
    () => buildRouteChartRows(stats?.by_route),
    [stats],
  );
  const fingerprintChart = useMemo(
    () => buildFingerprintChartRows(stats?.by_fingerprint),
    [stats],
  );

  const routeFormatter = (value: number) =>
    t("dashboard.countUnit", { value: value.toLocaleString() });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="hidden text-muted-foreground sm:block">
          {t("dashboard.description")}
        </p>
        <DateTimeRangePicker
          value={dateRange}
          onChange={handleDateRangeChange}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {t("dashboard.loadFailed", { message: error.message })}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          color="blue"
          label={t("dashboard.totalCount")}
          value={formatPlatformCountLabel(stats?.total_count, isLoading)}
          sub={
            dateParams ? t("dashboard.selectedRange") : t("dashboard.allTime")
          }
        />
        <MetricCard
          color="amber"
          label={t("dashboard.avgDuration")}
          value={formatPlatformDurationLabel(stats?.avg_duration_ms, isLoading)}
          sub={
            stats
              ? t("dashboard.maxDuration", {
                  value: formatPlatformDuration(stats.duration_max),
                })
              : undefined
          }
        />
        <MetricCard
          color="orange"
          label={t("dashboard.p95Duration")}
          value={formatPlatformDurationLabel(stats?.p95_duration_ms, isLoading)}
          sub={
            stats
              ? t("dashboard.avgValue", {
                  value: formatPlatformDuration(stats.avg_duration_ms),
                })
              : undefined
          }
        />
        <MetricCard
          color="red"
          label={t("dashboard.peakDuration")}
          value={formatPlatformDurationLabel(stats?.duration_max, isLoading)}
          sub={
            stats
              ? t("dashboard.p95Value", {
                  value: formatPlatformDuration(stats.p95_duration_ms),
                })
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SlowQueryBarChart
          title={t("dashboard.routeTop10")}
          data={routeChart}
          valueFormatter={routeFormatter}
          chartLabel={t("dashboard.countLabel")}
          isLoading={isLoading}
        />
        <SlowQueryBarChart
          title={t("dashboard.fingerprintTop10")}
          data={fingerprintChart}
          valueFormatter={formatPlatformDuration}
          chartLabel={t("dashboard.durationLabel")}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

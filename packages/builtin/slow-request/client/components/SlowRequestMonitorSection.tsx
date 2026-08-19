import { useMemo } from "react";

import {
  KpiCard,
  KpiCardGrid,
  type PlatformDashboardSectionProps,
} from "@rewindom/client-kit";
import { Alert, AlertDescription } from "@rewindom/ui/alert";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { usePlatformSlowRequestStats } from "../hooks/usePlatformSlowRequestStats.js";
import {
  buildRouteChartRows,
  formatPlatformCountLabel,
  formatPlatformDuration,
  formatPlatformDurationLabel,
} from "../lib/slow-request-dashboard.js";

import { SlowRequestBarChart } from "./SlowRequestBarChart.js";

export function SlowRequestMonitorSection({
  start_date,
  end_date,
}: PlatformDashboardSectionProps) {
  const { t } = useTranslation("slow-request");
  const {
    data: stats,
    isLoading,
    error,
  } = usePlatformSlowRequestStats({
    startDate: start_date,
    endDate: end_date,
  });

  const chartRows = useMemo(
    () => buildRouteChartRows(stats?.by_route),
    [stats],
  );

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-medium">{t("monitor.title")}</h2>
        <Link
          to="/platform/slow-request-logs"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          {t("monitor.viewAll")}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {t("monitor.loadFailed", { message: error.message })}
          </AlertDescription>
        </Alert>
      ) : null}

      <KpiCardGrid>
        <KpiCard
          variant="info"
          label={t("stats.total")}
          value={formatPlatformCountLabel(stats?.total_count, isLoading)}
          sub={
            start_date || end_date
              ? t("monitor.selectedRange")
              : t("monitor.allTime")
          }
        />
        <KpiCard
          variant="warning"
          label={t("stats.avg")}
          value={formatPlatformDurationLabel(stats?.avg_duration_ms, isLoading)}
        />
        <KpiCard
          variant="warning"
          label={t("stats.p95")}
          value={formatPlatformDurationLabel(stats?.p95_duration_ms, isLoading)}
        />
        <KpiCard
          variant="danger"
          label={t("stats.max")}
          value={formatPlatformDurationLabel(stats?.duration_max, isLoading)}
        />
      </KpiCardGrid>

      <SlowRequestBarChart
        title={t("stats.byRoute")}
        data={chartRows}
        valueFormatter={formatPlatformDuration}
        chartLabel={t("chart.avgDuration")}
        isLoading={isLoading}
      />
    </section>
  );
}

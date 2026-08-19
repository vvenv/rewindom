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

import { usePlatformSlowQueryStats } from "../hooks/usePlatformSlowQueryStats.js";
import {
  buildFingerprintChartRows,
  buildRouteChartRows,
  formatPlatformCountLabel,
  formatPlatformDuration,
  formatPlatformDurationLabel,
} from "../lib/slow-query-dashboard.js";

import { SlowQueryBarChart } from "./SlowQueryBarChart.js";

export function SlowQueryMonitorSection({
  start_date,
  end_date,
}: PlatformDashboardSectionProps) {
  const { t } = useTranslation("slow-query");
  const {
    data: stats,
    isLoading,
    error,
  } = usePlatformSlowQueryStats({
    startDate: start_date,
    endDate: end_date,
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
    t("monitor.countUnit", { value: value.toLocaleString() });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-medium">{t("monitor.title")}</h2>
        <Link
          to="/platform/slow-query-logs"
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
          label={t("monitor.totalCount")}
          value={formatPlatformCountLabel(stats?.total_count, isLoading)}
          sub={
            start_date || end_date
              ? t("monitor.selectedRange")
              : t("monitor.allTime")
          }
        />
        <KpiCard
          variant="warning"
          label={t("monitor.avgDuration")}
          value={formatPlatformDurationLabel(stats?.avg_duration_ms, isLoading)}
          sub={
            stats
              ? t("monitor.maxDuration", {
                  value: formatPlatformDuration(stats.duration_max),
                })
              : undefined
          }
        />
        <KpiCard
          variant="warning"
          label={t("monitor.p95Duration")}
          value={formatPlatformDurationLabel(stats?.p95_duration_ms, isLoading)}
          sub={
            stats
              ? t("monitor.avgValue", {
                  value: formatPlatformDuration(stats.avg_duration_ms),
                })
              : undefined
          }
        />
        <KpiCard
          variant="danger"
          label={t("monitor.peakDuration")}
          value={formatPlatformDurationLabel(stats?.duration_max, isLoading)}
          sub={
            stats
              ? t("monitor.p95Value", {
                  value: formatPlatformDuration(stats.p95_duration_ms),
                })
              : undefined
          }
        />
      </KpiCardGrid>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SlowQueryBarChart
          title={t("monitor.routeTop10")}
          data={routeChart}
          valueFormatter={routeFormatter}
          chartLabel={t("monitor.countLabel")}
          isLoading={isLoading}
        />
        <SlowQueryBarChart
          title={t("monitor.fingerprintTop10")}
          data={fingerprintChart}
          valueFormatter={formatPlatformDuration}
          chartLabel={t("monitor.durationLabel")}
          isLoading={isLoading}
        />
      </div>
    </section>
  );
}

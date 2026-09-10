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

import { usePlatformErrorStats } from "../hooks/usePlatformErrorStats.js";
import { usePlatformSystemHealth } from "../hooks/usePlatformSystemHealth.js";
import {
  buildCountChartRows,
  formatPlatformCountLabel,
} from "../lib/error-log-dashboard.js";

import { ErrorLogBarChart } from "./ErrorLogBarChart.js";
import { ErrorLogHealthPanel } from "./ErrorLogHealthPanel.js";

export function ErrorLogMonitorSection({
  start_date,
  end_date,
}: PlatformDashboardSectionProps) {
  const { t } = useTranslation("error-log");
  const {
    data: health,
    isLoading: healthLoading,
    error: healthError,
  } = usePlatformSystemHealth();
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = usePlatformErrorStats({
    startDate: start_date,
    endDate: end_date,
  });

  const routeChart = useMemo(
    () => buildCountChartRows(stats?.by_route),
    [stats],
  );
  const codeChart = useMemo(
    () => buildCountChartRows(stats?.by_error_code),
    [stats],
  );

  const countFormatter = (value: number) =>
    t("monitor.countUnit", { value: value.toLocaleString() });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-medium">{t("monitor.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("monitor.description")}</p>
        </div>
        <Link
          to="/platform/error-logs"
          className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          {t("monitor.viewAll")}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <ErrorLogHealthPanel
        health={health}
        isLoading={healthLoading}
        error={healthError}
      />

      {statsError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {t("monitor.loadFailed", { message: statsError.message })}
          </AlertDescription>
        </Alert>
      ) : null}

      <KpiCardGrid>
        <KpiCard
          variant="info"
          label={t("monitor.total")}
          value={formatPlatformCountLabel(stats?.total, statsLoading)}
          sub={
            start_date || end_date
              ? t("monitor.selectedRange")
              : t("monitor.allTime")
          }
        />
        <KpiCard
          variant="danger"
          label={t("monitor.errors")}
          value={formatPlatformCountLabel(stats?.by_level?.error, statsLoading)}
        />
        <KpiCard
          variant="warning"
          label={t("monitor.warnings")}
          value={formatPlatformCountLabel(stats?.by_level?.warn, statsLoading)}
        />
      </KpiCardGrid>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ErrorLogBarChart
          title={t("monitor.topRoutes")}
          data={routeChart}
          valueFormatter={countFormatter}
          chartLabel={t("monitor.countLabel")}
          isLoading={statsLoading}
        />
        <ErrorLogBarChart
          title={t("monitor.topErrorCodes")}
          data={codeChart}
          valueFormatter={countFormatter}
          chartLabel={t("monitor.countLabel")}
          isLoading={statsLoading}
        />
      </div>
    </section>
  );
}

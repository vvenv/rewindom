import { useMemo } from "react";


import { DateTimeRangePicker } from "@be-water/client-kit";
import { Alert, AlertDescription } from "@be-water/ui/alert";

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

  const routeFormatter = (value: number) => `${value.toLocaleString()} 次`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="hidden text-muted-foreground sm:block">
          跨租户慢查询统计概览，帮助定位性能瓶颈
        </p>
        <DateTimeRangePicker
          value={dateRange}
          onChange={handleDateRangeChange}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>加载统计数据失败：{error.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          color="blue"
          label="慢查询总数"
          value={formatPlatformCountLabel(stats?.total_count, isLoading)}
          sub={dateParams ? `所选时间范围内` : "全部时间"}
        />
        <MetricCard
          color="amber"
          label="平均耗时"
          value={formatPlatformDurationLabel(stats?.avg_duration_ms, isLoading)}
          sub={
            stats
              ? `最高: ${formatPlatformDuration(stats.duration_max)}`
              : undefined
          }
        />
        <MetricCard
          color="orange"
          label="P95 耗时"
          value={formatPlatformDurationLabel(stats?.p95_duration_ms, isLoading)}
          sub={
            stats
              ? `均值: ${formatPlatformDuration(stats.avg_duration_ms)}`
              : undefined
          }
        />
        <MetricCard
          color="red"
          label="最高耗时"
          value={formatPlatformDurationLabel(stats?.duration_max, isLoading)}
          sub={
            stats
              ? `P95: ${formatPlatformDuration(stats.p95_duration_ms)}`
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SlowQueryBarChart
          title="路由慢查询次数 Top 10"
          data={routeChart}
          valueFormatter={routeFormatter}
          chartLabel="次数"
          isLoading={isLoading}
        />
        <SlowQueryBarChart
          title="SQL 指纹最高耗时 Top 10"
          data={fingerprintChart}
          valueFormatter={formatPlatformDuration}
          chartLabel="耗时"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

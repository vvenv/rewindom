import { useCallback, useMemo } from "react";


import { Card, CardContent, CardHeader, CardTitle } from "@be-water/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@be-water/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  XAxis,
  YAxis,
  type BarShapeProps,
} from "recharts";

import {
  getPlatformSeverityColor,
  PLATFORM_DASHBOARD_MAX_LABEL_LEN,
  truncatePlatformLabel,
  type PlatformChartRow,
} from "../lib/slow-query-dashboard.js";

export function SlowQueryBarChart({
  title,
  data,
  valueFormatter,
  chartLabel,
  isLoading,
}: {
  title: string;
  data: PlatformChartRow[];
  valueFormatter: (value: number) => string;
  chartLabel: string;
  isLoading: boolean;
}) {
  const maxValue = data.reduce((max, item) => Math.max(max, item.value), 0);

  const chartConfig = useMemo(
    () =>
      ({
        value: {
          label: chartLabel,
        },
      }) satisfies ChartConfig,
    [chartLabel],
  );

  const shapeRenderer = useCallback(
    (props: BarShapeProps) => {
      const { value, ...rest } = props;
      return (
        <Rectangle
          {...rest}
          fill={getPlatformSeverityColor(value as number, maxValue)}
        />
      );
    },
    [maxValue],
  );

  const tooltipFormatter = useCallback(
    (value: unknown, _name: unknown, item: unknown) => {
      const color =
        item && typeof item === "object" && "color" in item
          ? (item as { color?: string }).color
          : undefined;
      const key =
        item && typeof item === "object" && "dataKey" in item
          ? String((item as { dataKey?: unknown }).dataKey ?? "")
          : "";
      const name =
        item && typeof item === "object" && "name" in item
          ? String((item as { name?: unknown }).name ?? "")
          : "";

      return (
        <div
          key={`${key}-${name}`}
          className="flex w-full items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: color }}
            />
            <span className="text-muted-foreground">{chartLabel}</span>
          </div>
          <span className="font-mono font-medium tabular-nums">
            {valueFormatter(value as number)}
          </span>
        </div>
      );
    },
    [chartLabel, valueFormatter],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            加载中...
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            暂无数据
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <BarChart
              accessibilityLayer
              data={data}
              layout="vertical"
              margin={{ left: 0, right: 20, top: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 11 }}
                tickFormatter={(value: string) =>
                  truncatePlatformLabel(value, PLATFORM_DASHBOARD_MAX_LABEL_LEN)
                }
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelKey="fullName"
                    formatter={tooltipFormatter}
                  />
                }
                cursor={{ fill: "hsl(var(--muted))" }}
              />
              <Bar
                dataKey="value"
                radius={[0, 4, 4, 0]}
                shape={shapeRenderer}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

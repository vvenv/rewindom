export const PLATFORM_DASHBOARD_TOP_N = 10;
export const PLATFORM_DASHBOARD_MAX_LABEL_LEN = 16;

export const PLATFORM_SEVERITY_COLORS = [
  "#22c55e",
  "#84cc16",
  "#eab308",
  "#f97316",
  "#ef4444",
] as const;

export interface PlatformChartRow {
  name: string;
  fullName?: string;
  value: number;
}

export function getPlatformSeverityColor(value: number, max: number): string {
  if (max <= 0) return PLATFORM_SEVERITY_COLORS[0];
  const ratio = Math.min(value / max, 1);
  const index = Math.floor(ratio * (PLATFORM_SEVERITY_COLORS.length - 1));
  return PLATFORM_SEVERITY_COLORS[
    Math.min(index, PLATFORM_SEVERITY_COLORS.length - 1)
  ]!;
}

export function truncatePlatformLabel(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function formatPlatformDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

export function buildRouteChartRows(
  items:
    | Array<{ route: string; method: string; avg_duration_ms: number }>
    | undefined,
  topN = PLATFORM_DASHBOARD_TOP_N,
): PlatformChartRow[] {
  if (!items) return [];

  return items
    .slice()
    .sort((a, b) => b.avg_duration_ms - a.avg_duration_ms)
    .slice(0, topN)
    .map((item) => {
      const fullName = `${item.method} ${item.route}`;
      return {
        name: fullName,
        fullName,
        value: item.avg_duration_ms,
      };
    });
}

export function formatPlatformCountLabel(
  value: number | undefined,
  isLoading: boolean,
): string {
  if (isLoading) return "—";
  return (value ?? 0).toLocaleString();
}

export function formatPlatformDurationLabel(
  value: number | undefined,
  isLoading: boolean,
): string {
  if (isLoading) return "—";
  return formatPlatformDuration(value ?? 0);
}

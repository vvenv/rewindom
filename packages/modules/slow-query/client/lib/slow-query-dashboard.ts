export const PLATFORM_DASHBOARD_TOP_N = 10;
export const PLATFORM_DASHBOARD_MAX_LABEL_LEN = 16;
export const PLATFORM_DASHBOARD_MAX_FINGERPRINT_LEN = 40;

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
  ];
}

export function truncatePlatformLabel(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function formatPlatformDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

export function buildRouteChartRows(
  items: Array<{ route: string; count: number }> | undefined,
  topN = PLATFORM_DASHBOARD_TOP_N,
): PlatformChartRow[] {
  if (!items) return [];

  return items
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
    .map((item) => ({
      name: item.route,
      fullName: item.route,
      value: item.count,
    }));
}

export function buildFingerprintChartRows(
  items: Array<{ fingerprint: string; max_duration_ms: number }> | undefined,
  topN = PLATFORM_DASHBOARD_TOP_N,
): PlatformChartRow[] {
  if (!items) return [];

  return items
    .slice()
    .sort((a, b) => b.max_duration_ms - a.max_duration_ms)
    .slice(0, topN)
    .map((item) => ({
      name: truncatePlatformLabel(
        item.fingerprint,
        PLATFORM_DASHBOARD_MAX_FINGERPRINT_LEN,
      ),
      fullName: item.fingerprint,
      value: item.max_duration_ms,
    }));
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

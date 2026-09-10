import type {
  DependencyAggregateStatus,
  DependencyCheck,
  DependencyName,
} from "../../shared/index.js";

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

export function buildCountChartRows(
  counts: Record<string, number> | undefined,
  topN = PLATFORM_DASHBOARD_TOP_N,
): PlatformChartRow[] {
  if (!counts) return [];

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name, value]) => ({
      name,
      fullName: name,
      value,
    }));
}

export function formatPlatformCountLabel(
  value: number | undefined,
  isLoading: boolean,
): string {
  if (isLoading) return "—";
  return (value ?? 0).toLocaleString();
}

export function dependencyErrorLogsPath(name: DependencyName): string {
  return `/platform/error-logs?q=${encodeURIComponent(`service:${name}`)}`;
}

export function overallHealthAlertVariant(
  status: DependencyAggregateStatus,
): "success" | "warning" | "destructive" {
  if (status === "ok") return "success";
  if (status === "degraded") return "warning";
  return "destructive";
}

export function checkHealthKpiVariant(
  check: Pick<DependencyCheck, "status" | "required">,
): "success" | "warning" | "danger" {
  if (check.status === "ok") return "success";
  return check.required ? "danger" : "warning";
}

// Slow query related types

export interface SlowQueryLogItem {
  id: string;
  duration_ms: number;
  query: string;
  params: string | null;
  fingerprint: string;
  target: string | null;
  route: string | null;
  method: string | null;
  tenant_slug: string | null;
  user_id: string | null;
  username: string | null;
  request_id: string | null;
  source: string;
  created_at: string;
}

export interface SlowQueryStats {
  total_count: number;
  avg_duration_ms: number;
  p95_duration_ms: number;
  duration_max: number;
  by_route: { route: string; count: number; avg_duration_ms: number }[];
  by_fingerprint: {
    fingerprint: string;
    count: number;
    max_duration_ms: number;
    avg_duration_ms: number;
  }[];
}

export const SLOW_QUERY_SOURCES = ["http", "worker", "scheduler", "unknown"] as const;
export type SlowQuerySource = (typeof SLOW_QUERY_SOURCES)[number];

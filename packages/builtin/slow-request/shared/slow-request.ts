export interface SlowRequestLogItem {
  id: string;
  duration_ms: number;
  status_code: number;
  route: string;
  path: string | null;
  method: string;
  tenant_slug: string | null;
  /** 平台侧列表按 slug 回填的租户名称。 */
  tenant_name?: string | null;
  user_id: string | null;
  username: string | null;
  request_id: string | null;
  source: string;
  created_at: string;
}

export interface SlowRequestStats {
  total_count: number;
  avg_duration_ms: number;
  p95_duration_ms: number;
  duration_max: number;
  by_route: {
    route: string;
    method: string;
    count: number;
    avg_duration_ms: number;
    max_duration_ms: number;
  }[];
}

export const SLOW_REQUEST_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
] as const;
export type SlowRequestMethod = (typeof SLOW_REQUEST_METHODS)[number];

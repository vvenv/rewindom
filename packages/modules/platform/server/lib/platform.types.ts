export interface TenantIdParams {
  id: string;
}

export interface JobIdParams {
  job_id: string;
}

export function parseTitle(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

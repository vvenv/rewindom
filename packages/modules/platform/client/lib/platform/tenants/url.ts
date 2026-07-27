import type { TenantStatus, TenantSummary } from "../../../../shared/index.js";

export interface PlatformTenantListFilters {
  q?: string;
  status?: TenantStatus;
}

export const TENANT_STATUS_FILTER_LABELS: Record<TenantStatus, string> = {
  active: "正常",
  suspended: "已暂停",
  archived: "已归档",
};

const TENANT_STATUS_VALUES = new Set<TenantStatus>([
  "active",
  "suspended",
  "archived",
]);

function isTenantStatus(value: string): value is TenantStatus {
  return TENANT_STATUS_VALUES.has(value as TenantStatus);
}

export function parseTenantFiltersFromParams(
  searchParams: URLSearchParams,
): PlatformTenantListFilters {
  const filters: PlatformTenantListFilters = {};

  const q = searchParams.get("q");
  if (q) filters.q = q;

  const status = searchParams.get("status");
  if (status && isTenantStatus(status)) {
    filters.status = status;
  }

  return filters;
}

export function serializeTenantFiltersToParams(
  filters: PlatformTenantListFilters,
  prev: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(prev);
  const setOrDelete = (key: string, value: string | undefined) => {
    if (value !== undefined && value !== "") params.set(key, value);
    else params.delete(key);
  };

  setOrDelete("q", filters.q);
  setOrDelete("status", filters.status);

  return params;
}

export function filterPlatformTenants(
  tenants: TenantSummary[],
  filters: PlatformTenantListFilters,
): TenantSummary[] {
  let list = tenants;

  if (filters.status) {
    list = list.filter((tenant) => tenant.status === filters.status);
  }

  const q = filters.q?.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (tenant) =>
        tenant.slug.toLowerCase().includes(q) ||
        tenant.name.toLowerCase().includes(q) ||
        (tenant.remark?.toLowerCase().includes(q) ?? false),
    );
  }

  return list;
}

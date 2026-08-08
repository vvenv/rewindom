import { useMemo } from "react";

import { useSearchParams } from "react-router";

import {
  filterPlatformTenants,
  parseTenantFiltersFromParams,
} from "../lib/platform/tenants/url.js";

import { usePlatformTenants } from "./usePlatformTenants.js";

export function usePlatformTenantsPage() {
  const [searchParams] = useSearchParams();
  const filters = useMemo(
    () => parseTenantFiltersFromParams(searchParams),
    [searchParams],
  );

  const query = usePlatformTenants(filters.status === "archived");
  const displayedTenants = useMemo(
    () => filterPlatformTenants(query.data ?? [], filters),
    [query.data, filters],
  );

  return {
    filters,
    displayedTenants,
    ...query,
  };
}

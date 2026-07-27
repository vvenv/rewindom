import { useCallback } from "react";

import { FilterBar } from "@be-water/client-kit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";
import { useSearchParams } from "react-router";

import {
  type PlatformTenantListFilters,
  parseTenantFiltersFromParams,
  serializeTenantFiltersToParams,
  TENANT_STATUS_FILTER_LABELS,
} from "../lib/platform/tenants/url.js";

import type { TenantStatus } from "../../shared/index.js";

interface TenantFiltersProps {
  filters: PlatformTenantListFilters;
}

export function TenantFilters({ filters }: TenantFiltersProps) {
  const [, setSearchParams] = useSearchParams();

  const applyFilters = useCallback(
    (
      update:
        | Partial<PlatformTenantListFilters>
        | ((prev: PlatformTenantListFilters) => PlatformTenantListFilters),
    ) => {
      setSearchParams((prevParams) => {
        const prevFilters = parseTenantFiltersFromParams(prevParams);
        const nextFilters =
          typeof update === "function"
            ? update(prevFilters)
            : { ...prevFilters, ...update };
        return serializeTenantFiltersToParams(nextFilters, prevParams);
      });
    },
    [setSearchParams],
  );

  const hasActiveFilters = Boolean(filters.q || filters.status);

  const handleReset = () => {
    applyFilters({ q: undefined, status: undefined });
  };

  return (
    <FilterBar
      search={{
        value: filters.q,
        onCommit: (value: string) => {
          applyFilters({ q: value.trim() || undefined });
        },
        placeholder: "搜索标识或名称",
        className: "max-w-48",
      }}
      inlineContent={
        <Select
          value={filters.status ?? ""}
          onValueChange={(value) => {
            const next = value ?? "";
            applyFilters({
              status: next === "" ? undefined : (next as TenantStatus),
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            <SelectItem value="">全部状态</SelectItem>
            {(
              Object.entries(TENANT_STATUS_FILTER_LABELS) as [
                TenantStatus,
                string,
              ][]
            ).map(([code, label]) => (
              <SelectItem key={code} value={code}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      hasActiveFilters={hasActiveFilters}
      onReset={handleReset}
    />
  );
}

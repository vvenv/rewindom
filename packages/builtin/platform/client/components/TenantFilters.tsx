import { useCallback } from "react";

import { FilterBar } from "@rewindom/client-kit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import {
  type PlatformTenantListFilters,
  parseTenantFiltersFromParams,
  serializeTenantFiltersToParams,
  TENANT_STATUSES,
} from "../lib/platform/tenants/url.js";

import type { TenantStatus } from "../../shared/index.js";

interface TenantFiltersProps {
  filters: PlatformTenantListFilters;
}

export function TenantFilters({ filters }: TenantFiltersProps) {
  const { t } = useTranslation("platform");
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
        placeholder: t("tenants.filters.searchPlaceholder"),
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
            <SelectValue placeholder={t("tenants.filters.allStatus")} />
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            <SelectItem value="">{t("tenants.filters.allStatus")}</SelectItem>
            {TENANT_STATUSES.map((code) => (
              <SelectItem key={code} value={code}>
                {t(`tenants.status.${code}`)}
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

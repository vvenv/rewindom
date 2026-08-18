import { useState } from "react";

import {
  DateTimeRangePicker,
  DebouncedSearchInput,
  FilterBar,
  dateRangeToDatetimeFilterParams,
  datetimeFilterParamsToDateRange,
  useTenantFilter,
} from "@rewindom/client-kit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import { useTranslation } from "react-i18next";

import { SLOW_REQUEST_METHODS } from "../../shared/index.js";

import type { DateRange } from "react-day-picker";

export interface SlowRequestLogFilterValues {
  route?: string;
  method?: string;
  min_duration_ms?: string;
  status_code?: string;
  tenant_slug?: string;
  start_date?: string;
  end_date?: string;
}

interface SlowRequestLogFiltersProps {
  filters: SlowRequestLogFilterValues;
  onFiltersChange: (filters: SlowRequestLogFilterValues) => void;
  showTenantFilter?: boolean;
}

export function SlowRequestLogFilters({
  filters,
  onFiltersChange,
  showTenantFilter = false,
}: SlowRequestLogFiltersProps) {
  const { t } = useTranslation(["slow-request", "common"]);
  const TenantFilter = useTenantFilter();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    datetimeFilterParamsToDateRange(filters.start_date, filters.end_date),
  );

  const [prevFilters, setPrevFilters] = useState(filters);
  if (prevFilters !== filters) {
    setPrevFilters(filters);
    setDateRange(
      datetimeFilterParamsToDateRange(filters.start_date, filters.end_date),
    );
  }

  const updateField = (
    key: keyof SlowRequestLogFilterValues,
    value: string | undefined,
  ) => {
    onFiltersChange({ ...filters, [key]: value || undefined });
  };

  const handleDateChange = (range: DateRange | undefined) => {
    setDateRange(range);
    const params = dateRangeToDatetimeFilterParams(range);
    onFiltersChange({
      ...filters,
      start_date: params.start_date,
      end_date: params.end_date,
    });
  };

  const handleReset = () => {
    setDateRange(undefined);
    onFiltersChange({});
  };

  const hasActiveFilters = Boolean(
    filters.route ||
    filters.method ||
    filters.min_duration_ms ||
    filters.status_code ||
    filters.tenant_slug ||
    filters.start_date,
  );

  return (
    <FilterBar
      search={{
        value: filters.route,
        onCommit: (value: string) => updateField("route", value),
        placeholder: t("filters.route"),
        className: "w-40",
      }}
      inlineContent={
        <>
          <Select
            value={filters.method ?? ""}
            onValueChange={(value) => updateField("method", value)}
          >
            <SelectTrigger className="w-28">
              <SelectValue placeholder={t("filters.method")} />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              {SLOW_REQUEST_METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateTimeRangePicker value={dateRange} onChange={handleDateChange} />
          {showTenantFilter && TenantFilter ? (
            <TenantFilter
              value={filters.tenant_slug ?? null}
              onValueChange={(slug) =>
                updateField("tenant_slug", slug ?? undefined)
              }
              placeholder={t("filters.tenant")}
              showClear
              className="w-44"
            />
          ) : null}
          <DebouncedSearchInput
            placeholder={t("filters.status")}
            type="number"
            value={filters.status_code ?? ""}
            onCommit={(value) => updateField("status_code", value)}
            className="w-28"
          />
          <DebouncedSearchInput
            placeholder={t("filters.minDuration")}
            type="number"
            value={filters.min_duration_ms ?? ""}
            onCommit={(value) => updateField("min_duration_ms", value)}
            className="w-36"
          />
        </>
      }
      hasActiveFilters={hasActiveFilters}
      onReset={handleReset}
    />
  );
}

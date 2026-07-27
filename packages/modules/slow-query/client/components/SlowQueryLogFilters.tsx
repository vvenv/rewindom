import { useState } from "react";

import {
  DateTimeRangePicker,
  DebouncedSearchInput,
  FilterBar,
  dateRangeToDatetimeFilterParams,
  datetimeFilterParamsToDateRange,
  useTenantFilter,
} from "@be-water/client-kit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";

import { SLOW_QUERY_SOURCES } from "../../shared/index.js";

import type { DateRange } from "react-day-picker";

export interface SlowQueryLogFilterValues {
  route?: string;
  fingerprint?: string;
  min_duration_ms?: string;
  source?: string;
  tenant_slug?: string;
  start_date?: string;
  end_date?: string;
}

interface SlowQueryLogFiltersProps {
  filters: SlowQueryLogFilterValues;
  onFiltersChange: (filters: SlowQueryLogFilterValues) => void;
  showTenantFilter?: boolean;
}

export function SlowQueryLogFilters({
  filters,
  onFiltersChange,
  showTenantFilter = false,
}: SlowQueryLogFiltersProps) {
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
    key: keyof SlowQueryLogFilterValues,
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
    filters.fingerprint ||
    filters.min_duration_ms ||
    filters.source ||
    filters.tenant_slug ||
    filters.start_date,
  );

  return (
    <FilterBar
      search={{
        value: filters.route,
        onCommit: (value: string) => updateField("route", value),
        placeholder: "路由",
        className: "w-40",
      }}
      inlineContent={
        <>
          <Select
            value={filters.source ?? ""}
            onValueChange={(value) => updateField("source", value)}
          >
            <SelectTrigger className="w-28">
              <SelectValue placeholder="来源" />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              {SLOW_QUERY_SOURCES.map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
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
              placeholder="租户"
              showClear
              className="w-44"
            />
          ) : null}
          <DebouncedSearchInput
            placeholder="指纹"
            value={filters.fingerprint ?? ""}
            onCommit={(value) => updateField("fingerprint", value)}
            className="w-40"
          />
          <DebouncedSearchInput
            placeholder="最小耗时 (ms)"
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

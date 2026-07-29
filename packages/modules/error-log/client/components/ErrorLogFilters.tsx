import { useState } from "react";

import {
  DateTimeRangePicker,
  FilterBar,
  useTenantFilter,
} from "@be-water/client-kit";
import { formatBusinessDate } from "@be-water/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";

import { ERROR_LEVEL_LABELS } from "../../shared/index.js";

import type { DateRange } from "react-day-picker";

export interface ErrorLogFilterValues {
  level?: string;
  user_id?: string;
  q?: string;
  tenant_slug?: string;
  start_date?: string;
  end_date?: string;
}

interface ErrorLogFiltersProps {
  filters: ErrorLogFilterValues;
  onFiltersChange: (filters: ErrorLogFilterValues) => void;
  /**
   * 租户下拉只属于平台控制台。必须显式开启：`TenantFilterProvider` 挂在
   * `ShellProviders` 上，租户 AppLayout 也在其作用域内，光判断
   * `useTenantFilter()` 非空会把跨租户选择器漏到租户页上。
   */
  showTenantFilter?: boolean;
}

function dateRangeFromFilters(
  start_date?: string,
  end_date?: string,
): DateRange | undefined {
  if (!start_date) {
    return undefined;
  }
  return {
    from: new Date(start_date),
    to: end_date ? new Date(end_date) : undefined,
  };
}

export function ErrorLogFilters({
  filters,
  onFiltersChange,
  showTenantFilter = false,
}: ErrorLogFiltersProps) {
  const TenantFilter = useTenantFilter();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    dateRangeFromFilters(filters.start_date, filters.end_date),
  );

  const [prevFilters, setPrevFilters] = useState(filters);
  if (prevFilters !== filters) {
    setPrevFilters(filters);
    setDateRange(dateRangeFromFilters(filters.start_date, filters.end_date));
  }

  const hasActiveFilters = Boolean(
    filters.level ||
    filters.q ||
    filters.tenant_slug ||
    filters.start_date ||
    filters.end_date,
  );

  const handleReset = () => {
    onFiltersChange({
      level: undefined,
      user_id: undefined,
      q: undefined,
      tenant_slug: undefined,
      start_date: undefined,
      end_date: undefined,
    });
    setDateRange(undefined);
  };

  const handleLevelChange = (val: string | null) => {
    const value = val ?? "";
    onFiltersChange({
      ...filters,
      level: value === "" ? undefined : value,
    });
  };

  return (
    <FilterBar
      search={{
        value: filters.q,
        onCommit: (value: string) => {
          onFiltersChange({
            ...filters,
            q: value.trim() || undefined,
          });
        },
        placeholder: "账号 / 路由 / 错误代码",
        className: "w-48",
      }}
      inlineContent={
        <>
          <Select value={filters.level ?? ""} onValueChange={handleLevelChange}>
            <SelectTrigger>
              <SelectValue placeholder="全部级别" />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              {Object.entries(ERROR_LEVEL_LABELS).map(([code, label]) => (
                <SelectItem key={code} value={code}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateTimeRangePicker
            value={dateRange}
            onChange={(range) => {
              setDateRange(range);
              onFiltersChange({
                ...filters,
                start_date: range?.from
                  ? formatBusinessDate(range.from)
                  : undefined,
                end_date: range?.to ? formatBusinessDate(range.to) : undefined,
              });
            }}
          />
          {showTenantFilter && TenantFilter && (
            <TenantFilter
              value={filters.tenant_slug ?? null}
              onValueChange={(slug) => {
                onFiltersChange({
                  ...filters,
                  tenant_slug: slug || undefined,
                });
              }}
              placeholder="租户"
              showClear
              className="w-40"
            />
          )}
        </>
      }
      hasActiveFilters={hasActiveFilters}
      onReset={handleReset}
    />
  );
}

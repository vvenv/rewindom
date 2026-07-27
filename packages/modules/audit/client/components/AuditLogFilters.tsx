import { useState } from "react";

import {
  DateTimeRangePicker,
  DebouncedSearchInput,
  FilterBar,
  useTenantFilter,
} from "@be-water/client-kit";
import { formatBusinessDate } from "@be-water/shared";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";

import { AUDIT_ACTION_GROUPS, AUDIT_ACTION_LABELS } from "../../shared/index.js";

import type { PlatformAuditLogFilters } from "../hooks/usePlatformAuditLogsPage.js";
import type { DateRange } from "react-day-picker";

interface AuditLogFiltersProps {
  filters: PlatformAuditLogFilters;
  onTenantChange: (slug: string | null) => void;
  onUsernameChange: (username: string) => void;
  onFiltersChange: (
    filters: Pick<
      PlatformAuditLogFilters,
      "action" | "start_date" | "end_date"
    >,
  ) => void;
  onReset: () => void;
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

export function AuditLogFilters({
  filters,
  onTenantChange,
  onUsernameChange,
  onFiltersChange,
  onReset,
}: AuditLogFiltersProps) {
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
    filters.action ||
    filters.username ||
    filters.tenant_slug ||
    filters.start_date ||
    filters.end_date,
  );

  const handleActionChange = (val: string | null) => {
    const value = val ?? "";
    onFiltersChange({
      ...filters,
      action: value === "" ? undefined : value,
    });
  };

  return (
    <FilterBar
      inlineContent={
        <>
          <Select
            value={filters.action ?? ""}
            onValueChange={handleActionChange}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="全部操作" />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              {AUDIT_ACTION_GROUPS.map((group, index) => (
                <SelectGroup key={group.label}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {AUDIT_ACTION_LABELS[action]}
                    </SelectItem>
                  ))}
                  {index < AUDIT_ACTION_GROUPS.length - 1 && (
                    <SelectSeparator />
                  )}
                </SelectGroup>
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
          {TenantFilter && (
            <TenantFilter
              value={filters.tenant_slug ?? null}
              onValueChange={onTenantChange}
              placeholder="租户"
              showClear
              className="w-40"
            />
          )}
          <DebouncedSearchInput
            value={filters.username}
            onCommit={(value) => onUsernameChange(value.trim())}
            className="w-40"
            placeholder="账号"
          />
        </>
      }
      hasActiveFilters={hasActiveFilters}
      onReset={onReset}
    />
  );
}

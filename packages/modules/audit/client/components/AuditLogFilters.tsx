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
import { useTranslation } from "react-i18next";

import {
  getAuditActionGroupViews,
  translateAuditAction,
  translateAuditActionGroup,
} from "../lib/audit-action-i18n.js";

import type { DateRange } from "react-day-picker";

export interface AuditLogFilterValues {
  action?: string;
  username?: string;
  /** 仅平台侧使用；租户侧不传，租户下拉也不会渲染。 */
  tenant_slug?: string;
  start_date?: string;
  end_date?: string;
}

interface AuditLogFiltersProps {
  filters: AuditLogFilterValues;
  /**
   * 传入即显示租户下拉。租户下拉只属于平台控制台：`TenantFilterProvider` 挂在
   * `ShellProviders` 上，租户 AppLayout 也在其作用域内，光判断
   * `useTenantFilter()` 非空会把跨租户选择器漏到租户页上。
   */
  onTenantChange?: (slug: string | null) => void;
  onUsernameChange: (username: string) => void;
  onFiltersChange: (
    filters: Pick<AuditLogFilterValues, "action" | "start_date" | "end_date">,
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
  const { t } = useTranslation(["audit", "common"]);
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
              <SelectValue placeholder={t("filters.allActions")} />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              {getAuditActionGroupViews().map((group, index, groups) => (
                <SelectGroup key={group.id}>
                  <SelectLabel>
                    {translateAuditActionGroup(t, group.id)}
                  </SelectLabel>
                  {group.actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {translateAuditAction(t, action)}
                    </SelectItem>
                  ))}
                  {index < groups.length - 1 && <SelectSeparator />}
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
          {TenantFilter && onTenantChange && (
            <TenantFilter
              value={filters.tenant_slug ?? null}
              onValueChange={onTenantChange}
              placeholder={t("filters.tenant")}
              showClear
              className="w-40"
            />
          )}
          <DebouncedSearchInput
            value={filters.username}
            onCommit={(value) => onUsernameChange(value.trim())}
            className="w-40"
            placeholder={t("filters.username")}
          />
        </>
      }
      hasActiveFilters={hasActiveFilters}
      onReset={onReset}
    />
  );
}

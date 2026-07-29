import { useCallback, useMemo } from "react";

import {
  applyFiltersToSearchParams,
  applySortingToSearchParams,
  getOptionalSearchParam,
  parseListSort,
  parseSearchParamsPagination,
  toSortingState,
} from "@be-water/client-kit/lib/list-url-params";
import { useSearchParams } from "react-router";

import type { AuditLogFilterValues } from "../components/AuditLogFilters.js";
import type { SortingState, Updater } from "@tanstack/react-table";

/** 租户侧审计日志页的 URL 状态。与平台侧的区别：没有 `tenant_slug` 维度。 */
export function useAuditLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, pageSize } = parseSearchParamsPagination(searchParams);
  const { sortBy, sortDir } = parseListSort(searchParams);
  const sorting = toSortingState(sortBy, sortDir);

  const filters: AuditLogFilterValues = useMemo(
    () => ({
      action: getOptionalSearchParam(searchParams, "action"),
      username: getOptionalSearchParam(searchParams, "username"),
      start_date: getOptionalSearchParam(searchParams, "start_date"),
      end_date: getOptionalSearchParam(searchParams, "end_date"),
    }),
    [searchParams],
  );

  const updateFilters = useCallback(
    (
      nextFilters: Pick<
        AuditLogFilterValues,
        "action" | "start_date" | "end_date"
      >,
    ) => {
      setSearchParams(applyFiltersToSearchParams(searchParams, nextFilters));
    },
    [searchParams, setSearchParams],
  );

  const updateUsername = useCallback(
    (username: string) => {
      setSearchParams(
        applyFiltersToSearchParams(searchParams, {
          username: username.trim() || undefined,
        }),
      );
    },
    [searchParams, setSearchParams],
  );

  const resetFilters = useCallback(() => {
    setSearchParams(
      applyFiltersToSearchParams(searchParams, {
        action: undefined,
        username: undefined,
        start_date: undefined,
        end_date: undefined,
      }),
    );
  }, [searchParams, setSearchParams]);

  const handleSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      setSearchParams(
        applySortingToSearchParams(searchParams, updater, sorting),
      );
    },
    [searchParams, setSearchParams, sorting],
  );

  return {
    filters,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    updateFilters,
    updateUsername,
    resetFilters,
    handleSortingChange,
  };
}

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

import type { ErrorLogFilterValues } from "../components/ErrorLogFilters.js";
import type { SortingState, Updater } from "@tanstack/react-table";

/** 租户侧错误日志页的 URL 状态。与平台侧的区别：没有 `tenant_slug` 维度。 */
export function useErrorLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, pageSize } = parseSearchParamsPagination(searchParams);
  const { sortBy, sortDir } = parseListSort(searchParams);
  const sorting = toSortingState(sortBy, sortDir);

  const filters: ErrorLogFilterValues = useMemo(
    () => ({
      level: getOptionalSearchParam(searchParams, "level"),
      q: getOptionalSearchParam(searchParams, "q"),
      start_date: getOptionalSearchParam(searchParams, "start_date"),
      end_date: getOptionalSearchParam(searchParams, "end_date"),
    }),
    [searchParams],
  );

  const logId = searchParams.get("log_id");

  const updateFilters = useCallback(
    (nextFilters: ErrorLogFilterValues) => {
      setSearchParams(applyFiltersToSearchParams(searchParams, nextFilters));
    },
    [searchParams, setSearchParams],
  );

  const handleSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      setSearchParams(
        applySortingToSearchParams(searchParams, updater, sorting),
      );
    },
    [searchParams, setSearchParams, sorting],
  );

  const selectLog = useCallback(
    (id: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("log_id", id);
        return next;
      });
    },
    [setSearchParams],
  );

  const clearSelectedLog = useCallback(
    (open: boolean) => {
      if (open) return;
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("log_id");
        return next;
      });
    },
    [setSearchParams],
  );

  return {
    filters,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    logId,
    updateFilters,
    handleSortingChange,
    selectLog,
    clearSelectedLog,
  };
}

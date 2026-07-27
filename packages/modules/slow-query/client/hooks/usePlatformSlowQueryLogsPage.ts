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

import type { SlowQueryLogFilterValues } from "../components/SlowQueryLogFilters.js";
import type { SortingState, Updater } from "@tanstack/react-table";

const DEFAULT_SLOW_QUERY_SORT: SortingState = [
  { id: "created_at", desc: true },
];

export function usePlatformSlowQueryLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, pageSize } = parseSearchParamsPagination(searchParams);
  const { sortBy, sortDir } = parseListSort(searchParams, "sort_order");

  const filters: SlowQueryLogFilterValues = useMemo(
    () => ({
      route: getOptionalSearchParam(searchParams, "route"),
      fingerprint: getOptionalSearchParam(searchParams, "fingerprint"),
      min_duration_ms: getOptionalSearchParam(searchParams, "min_duration_ms"),
      source: getOptionalSearchParam(searchParams, "source"),
      tenant_slug: getOptionalSearchParam(searchParams, "tenant_slug"),
      start_date: getOptionalSearchParam(searchParams, "start_date"),
      end_date: getOptionalSearchParam(searchParams, "end_date"),
    }),
    [searchParams],
  );

  const sorting = sortBy
    ? toSortingState(sortBy, sortDir)
    : DEFAULT_SLOW_QUERY_SORT;

  const logId = searchParams.get("log_id");

  const updateFilters = useCallback(
    (nextFilters: SlowQueryLogFilterValues) => {
      setSearchParams(applyFiltersToSearchParams(searchParams, nextFilters));
    },
    [searchParams, setSearchParams],
  );

  const handleSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      setSearchParams(
        applySortingToSearchParams(
          searchParams,
          updater,
          sorting,
          "sort_order",
        ),
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
    sortOrder: sortDir,
    sorting,
    logId,
    updateFilters,
    handleSortingChange,
    selectLog,
    clearSelectedLog,
  };
}

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

import type { SortingState, Updater } from "@tanstack/react-table";

export interface PlatformErrorLogFilters {
  level?: string;
  q?: string;
  tenant_slug?: string;
  start_date?: string;
  end_date?: string;
}

function resolveErrorLogQ(searchParams: URLSearchParams): string | undefined {
  const q = getOptionalSearchParam(searchParams, "q");
  if (q) {
    return q;
  }
  return (
    getOptionalSearchParam(searchParams, "username") ??
    getOptionalSearchParam(searchParams, "route") ??
    getOptionalSearchParam(searchParams, "error_code")
  );
}

export function usePlatformErrorLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, pageSize } = parseSearchParamsPagination(searchParams);
  const { sortBy, sortDir } = parseListSort(searchParams);
  const sorting = toSortingState(sortBy, sortDir);

  const filters: PlatformErrorLogFilters = useMemo(
    () => ({
      level: getOptionalSearchParam(searchParams, "level"),
      q: resolveErrorLogQ(searchParams),
      tenant_slug: getOptionalSearchParam(searchParams, "tenant_slug"),
      start_date: getOptionalSearchParam(searchParams, "start_date"),
      end_date: getOptionalSearchParam(searchParams, "end_date"),
    }),
    [searchParams],
  );

  const logId = searchParams.get("log_id");

  const handleSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      setSearchParams(
        applySortingToSearchParams(searchParams, updater, sorting),
      );
    },
    [searchParams, setSearchParams, sorting],
  );

  const updateFilters = useCallback(
    (nextFilters: PlatformErrorLogFilters) => {
      setSearchParams(applyFiltersToSearchParams(searchParams, nextFilters));
    },
    [searchParams, setSearchParams],
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

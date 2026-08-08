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

export interface PlatformAuditLogFilters {
  action?: string;
  username?: string;
  tenant_slug?: string;
  start_date?: string;
  end_date?: string;
}

export function usePlatformAuditLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, pageSize } = parseSearchParamsPagination(searchParams);
  const { sortBy, sortDir } = parseListSort(searchParams);
  const sorting = toSortingState(sortBy, sortDir);

  const filters: PlatformAuditLogFilters = useMemo(
    () => ({
      action: getOptionalSearchParam(searchParams, "action"),
      username: getOptionalSearchParam(searchParams, "username"),
      tenant_slug: getOptionalSearchParam(searchParams, "tenant_slug"),
      start_date: getOptionalSearchParam(searchParams, "start_date"),
      end_date: getOptionalSearchParam(searchParams, "end_date"),
    }),
    [searchParams],
  );

  const updateFilters = useCallback(
    (
      nextFilters: Pick<
        PlatformAuditLogFilters,
        "action" | "start_date" | "end_date"
      >,
    ) => {
      setSearchParams(applyFiltersToSearchParams(searchParams, nextFilters));
    },
    [searchParams, setSearchParams],
  );

  const updateParam = useCallback(
    (key: keyof PlatformAuditLogFilters, value: string | undefined) => {
      setSearchParams(
        applyFiltersToSearchParams(searchParams, {
          [key]: value?.trim() || undefined,
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
        tenant_slug: undefined,
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
    updateParam,
    resetFilters,
    handleSortingChange,
  };
}

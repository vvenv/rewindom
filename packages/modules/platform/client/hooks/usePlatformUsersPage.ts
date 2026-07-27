import { useCallback } from "react";

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

export function usePlatformUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, pageSize } = parseSearchParamsPagination(searchParams);
  const { sortBy, sortDir } = parseListSort(searchParams);
  const sorting = toSortingState(sortBy, sortDir);

  const search = getOptionalSearchParam(searchParams, "q");
  const tenant_slug = getOptionalSearchParam(searchParams, "tenant_slug");

  const handleSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      setSearchParams(
        applySortingToSearchParams(searchParams, updater, sorting),
      );
    },
    [searchParams, setSearchParams, sorting],
  );

  const updateParam = useCallback(
    (key: "q" | "tenant_slug", value: string | undefined) => {
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
        q: undefined,
        tenant_slug: undefined,
      }),
    );
  }, [searchParams, setSearchParams]);

  return {
    search,
    tenant_slug,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    hasActiveFilters: Boolean(search || tenant_slug),
    updateParam,
    resetFilters,
    handleSortingChange,
  };
}

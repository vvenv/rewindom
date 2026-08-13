import { useCallback } from "react";

import {
  applyFiltersToSearchParams,
  applySortingToSearchParams,
  parseListPage,
  parseListPageSize,
  parseListSort,
  toSortingState,
} from "@rewindom/client-kit/lib/list-url-params";
import { useSearchParams } from "react-router";

import type { SortingState, Updater } from "@tanstack/react-table";

export function useSiteMembersPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") || undefined;
  const page = parseListPage(searchParams.get("page"));
  const pageSize = parseListPageSize(searchParams.get("page_size"));
  const { sortBy, sortDir } = parseListSort(searchParams);
  const sorting = toSortingState(sortBy, sortDir);

  const handleSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      setSearchParams(
        applySortingToSearchParams(searchParams, updater, sorting),
      );
    },
    [searchParams, setSearchParams, sorting],
  );

  const handleFiltersChange = useCallback(
    (filters: { q?: string }) => {
      setSearchParams(
        applyFiltersToSearchParams(searchParams, {
          q: filters.q,
        }),
      );
    },
    [searchParams, setSearchParams],
  );

  return {
    q,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    handleSortingChange,
    handleFiltersChange,
  };
}

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

export function usePlatformAdminsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("q") || undefined;
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

  const updateSearch = useCallback(
    (value: string) => {
      setSearchParams(
        applyFiltersToSearchParams(searchParams, { q: value || undefined }),
      );
    },
    [searchParams, setSearchParams],
  );

  return { search, page, pageSize, sortBy, sortDir, sorting, updateSearch, handleSortingChange };
}

import { useCallback } from "react";

import {
  applyFiltersToSearchParams,
  applySortingToSearchParams,
  hasActiveFilters,
  parseListPage,
  parseListPageSize,
  parseListSort,
  SEARCH_PARAM_FILTER_ALL,
  toSortingState,
} from "@be-water/module-sdk/client";
import { useSearchParams } from "react-router";

import {
  fromBookmarkSortValue,
  toBookmarkSortValue,
} from "../lib/bookmark-sort.js";

export interface BookmarkFilters {
  q?: string;
  host?: string;
}

export function useBookmarksPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") || undefined;
  const host = searchParams.get("host") || undefined;
  const page = parseListPage(searchParams.get("page"));
  const pageSize = parseListPageSize(searchParams.get("page_size"));
  const { sortBy, sortDir } = parseListSort(searchParams);
  const sortValue = toBookmarkSortValue(sortBy, sortDir);

  const handleSortChange = useCallback(
    (value: string) => {
      const next = fromBookmarkSortValue(value);
      setSearchParams(
        applySortingToSearchParams(
          searchParams,
          [{ id: next.sortBy, desc: next.sortDir === "desc" }],
          toSortingState(sortBy, sortDir),
        ),
      );
    },
    [searchParams, setSearchParams, sortBy, sortDir],
  );

  /** 接受部分更新：未给出的筛选项保持原值，给出 `undefined` 则清空。 */
  const handleFiltersChange = useCallback(
    (filters: BookmarkFilters) => {
      setSearchParams(
        applyFiltersToSearchParams(searchParams, { q, host, ...filters }),
      );
    },
    [searchParams, setSearchParams, q, host],
  );

  const handleHostChange = useCallback(
    (value: string) => {
      handleFiltersChange({
        host: value === SEARCH_PARAM_FILTER_ALL ? undefined : value,
      });
    },
    [handleFiltersChange],
  );

  const handleReset = useCallback(() => {
    handleFiltersChange({ q: undefined, host: undefined });
  }, [handleFiltersChange]);

  return {
    q,
    host,
    hostValue: host ?? SEARCH_PARAM_FILTER_ALL,
    page,
    pageSize,
    sortBy,
    sortDir,
    sortValue,
    isFiltered: hasActiveFilters({ q, host }),
    handleSortChange,
    handleFiltersChange,
    handleHostChange,
    handleReset,
  };
}

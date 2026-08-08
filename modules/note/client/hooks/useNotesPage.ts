import { useCallback } from "react";

import {
  applyFiltersToSearchParams,
  applySortingToSearchParams,
  parseListPage,
  parseListPageSize,
  parseListSort,
  toSortingState,
} from "@be-water/module-sdk/client";
import { useSearchParams } from "react-router";

import { fromNoteSortValue, toNoteSortValue } from "../lib/note-sort.js";

export function useNotesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") || undefined;
  const page = parseListPage(searchParams.get("page"));
  const pageSize = parseListPageSize(searchParams.get("page_size"));
  const { sortBy, sortDir } = parseListSort(searchParams);
  const sortValue = toNoteSortValue(sortBy, sortDir);

  const handleSortChange = useCallback(
    (value: string) => {
      const next = fromNoteSortValue(value);
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
    sortValue,
    handleSortChange,
    handleFiltersChange,
  };
}

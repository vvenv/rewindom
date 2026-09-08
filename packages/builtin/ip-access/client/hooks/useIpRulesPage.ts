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

/** URL 是列表状态的唯一真相源：刷新 / 分享链接都能回到同一屏。 */
export function useIpRulesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") || undefined;
  const action = searchParams.get("action") || undefined;
  const source = searchParams.get("source") || undefined;
  const page = parseListPage(searchParams.get("page"));
  const pageSize = parseListPageSize(searchParams.get("page_size"));
  const { sortBy, sortDir } = parseListSort(searchParams);
  const sorting = toSortingState(sortBy, sortDir);

  const updateFilters = useCallback(
    (filters: { q?: string; action?: string; source?: string }) => {
      setSearchParams(applyFiltersToSearchParams(searchParams, filters));
    },
    [searchParams, setSearchParams],
  );

  const handleSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      const next =
        typeof updater === "function" ? updater(sorting) : updater;
      setSearchParams(
        applySortingToSearchParams(searchParams, next, sorting),
      );
    },
    [searchParams, setSearchParams, sorting],
  );

  return {
    q,
    action,
    source,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    updateFilters,
    handleSortingChange,
  };
}

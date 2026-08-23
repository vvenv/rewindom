import { useCallback, useMemo } from "react";

import {
  applyFiltersToSearchParams,
  applySortingToSearchParams,
  getOptionalSearchParam,
  parseListSort,
  parseSearchParamsPagination,
  toSortingState,
} from "@rewindom/module-sdk/client";
import { useSearchParams } from "react-router";

import type { NewsletterFilterValues } from "../components/NewsletterFilters.js";
import type { SortingState, Updater } from "@tanstack/react-table";

/** 订阅名单页的 URL 状态：筛选 / 分页 / 排序都落地址栏，刷新不丢。 */
export function useNewsletterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, pageSize } = parseSearchParamsPagination(searchParams);
  const { sortBy, sortDir } = parseListSort(searchParams);
  const sorting = toSortingState(sortBy, sortDir);

  const filters: NewsletterFilterValues = useMemo(
    () => ({
      q: getOptionalSearchParam(searchParams, "q"),
      status: getOptionalSearchParam(searchParams, "status"),
    }),
    [searchParams],
  );

  const updateFilters = useCallback(
    (next: NewsletterFilterValues) => {
      setSearchParams(applyFiltersToSearchParams(searchParams, next));
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

  return {
    filters,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    updateFilters,
    handleSortingChange,
  };
}

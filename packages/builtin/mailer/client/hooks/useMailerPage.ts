import { useCallback, useMemo } from "react";

import {
  applyFiltersToSearchParams,
  applySortingToSearchParams,
  getOptionalSearchParam,
  parseListSort,
  parseSearchParamsPagination,
  toSortingState,
} from "@rewindom/client-kit/lib/list-url-params";
import { useSearchParams } from "react-router";

import type { MailDeliveryFilterValues } from "../components/MailDeliveryFilters.js";
import type { SortingState, Updater } from "@tanstack/react-table";

/** 投递记录页的 URL 状态：筛选 / 分页 / 排序都落在地址栏，刷新不丢。 */
export function useMailerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, pageSize } = parseSearchParamsPagination(searchParams);
  const { sortBy, sortDir } = parseListSort(searchParams);
  const sorting = toSortingState(sortBy, sortDir);

  const filters: MailDeliveryFilterValues = useMemo(
    () => ({
      q: getOptionalSearchParam(searchParams, "q"),
      status: getOptionalSearchParam(searchParams, "status"),
      source: getOptionalSearchParam(searchParams, "source"),
    }),
    [searchParams],
  );

  const updateFilters = useCallback(
    (next: MailDeliveryFilterValues) => {
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

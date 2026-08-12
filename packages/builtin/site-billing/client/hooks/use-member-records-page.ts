import { useCallback } from "react";

import {
  applyFiltersToSearchParams,
  applySortingToSearchParams,
  parseListPage,
  parseListPageSize,
  parseListSort,
  toSortingState,
} from "@be-water/client-kit/lib/list-url-params";
import { useSearchParams } from "react-router";

import {
  applyMemberRecordTab,
  parseMemberRecordTab,
  type MemberRecordTab,
} from "../lib/member-records.js";

import type { SortingState, Updater } from "@tanstack/react-table";

export function useMemberRecordsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = parseMemberRecordTab(searchParams.get("tab"));
  const status = searchParams.get("status") || undefined;
  const page = parseListPage(searchParams.get("page"));
  const pageSize = parseListPageSize(searchParams.get("page_size"));
  const { sortBy, sortDir } = parseListSort(searchParams);
  const sorting = toSortingState(sortBy, sortDir);

  const selectTab = useCallback(
    (next: MemberRecordTab) => {
      setSearchParams(applyMemberRecordTab(searchParams, next));
    },
    [searchParams, setSearchParams],
  );

  const setStatus = useCallback(
    (next?: string) => {
      setSearchParams(applyFiltersToSearchParams(searchParams, { status: next }));
    },
    [searchParams, setSearchParams],
  );

  const handleSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      setSearchParams(applySortingToSearchParams(searchParams, updater, sorting));
    },
    [searchParams, setSearchParams, sorting],
  );

  return {
    tab,
    status,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    selectTab,
    setStatus,
    handleSortingChange,
  };
}

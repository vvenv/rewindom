import { useCallback } from "react";

import {
  applyFiltersToSearchParams,
  applySortingToSearchParams,
  getOptionalSearchParam,
  parseListPage,
  parseListPageSize,
  parseListSort,
  toSortingState,
} from "@rewindom/module-sdk/client";
import { useSearchParams } from "react-router";

import { isContentFormatValue, isContentStatusValue } from "../lib/contents.js";

import type { ContentFormat, ContentStatus } from "../../shared/index.js";
import type { SortingState, Updater } from "@tanstack/react-table";

export function useContentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") || undefined;
  const formatRaw = getOptionalSearchParam(searchParams, "format");
  const statusRaw = getOptionalSearchParam(searchParams, "status");
  const format =
    formatRaw && isContentFormatValue(formatRaw) ? formatRaw : undefined;
  const status =
    statusRaw && isContentStatusValue(statusRaw) ? statusRaw : undefined;
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
    (filters: {
      q?: string;
      format?: ContentFormat | "";
      status?: ContentStatus | "";
    }) => {
      setSearchParams(
        applyFiltersToSearchParams(searchParams, {
          q: filters.q,
          format: filters.format || undefined,
          status: filters.status || undefined,
        }),
      );
    },
    [searchParams, setSearchParams],
  );

  return {
    q,
    format,
    status,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    handleSortingChange,
    handleFiltersChange,
  };
}

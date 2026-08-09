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

import type { SiteDocFilterState } from "../lib/site-doc-list.js";
import type { SortingState, Updater } from "@tanstack/react-table";

/**
 * 文档库列表的 URL 状态：筛选 + 分页 + 排序。
 *
 * 与其它列表页（`useUsersPage`）同口径：全部走 search params。列表接口一次返回
 * 全量，筛选 / 排序 / 切片在客户端做，但 page / page_size 仍然进 URL——刷新、
 * 分享链接、从编辑器回来时页码还在，也不另搞一套「本地分页」模式。
 */
export function useSiteDocsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") || undefined;
  const category = searchParams.get("category") || undefined;
  const status = searchParams.get("status") || undefined;
  const locale = searchParams.get("locale") || undefined;
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
    (filters: SiteDocFilterState) => {
      setSearchParams(
        applyFiltersToSearchParams(searchParams, {
          q: filters.q,
          category: filters.category,
          status: filters.status,
          locale: filters.locale,
        }),
      );
    },
    [searchParams, setSearchParams],
  );

  return {
    q,
    category,
    status,
    locale,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    handleSortingChange,
    handleFiltersChange,
  };
}

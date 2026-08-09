import { useCallback } from "react";

import {
  applySortingToSearchParams,
  parseListSort,
  toSortingState,
} from "@be-water/client-kit/lib/list-url-params";
import { setOrDeleteParam } from "@be-water/client-kit/lib/url-params";
import { useSearchParams } from "react-router";

import type { SiteDocFilterState } from "../lib/site-doc-list.js";
import type { SortingState, Updater } from "@tanstack/react-table";

/**
 * 文档库列表的 URL 状态：筛选 + 排序。
 *
 * 全部走 search params 而不是组件 state——刷新、分享链接、从编辑器回来时筛选还在，
 * 与其它列表页（`useUsersPage`）同口径。列表接口一次返回全量，所以这里没有
 * page / page_size，筛选也不用 `applyFiltersToSearchParams`（那个会顺手塞一个
 * 对本页没意义的 `page=1`）。
 */
export function useSiteDocsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") || undefined;
  const category = searchParams.get("category") || undefined;
  const status = searchParams.get("status") || undefined;
  const locale = searchParams.get("locale") || undefined;
  const { sortBy, sortDir } = parseListSort(searchParams);
  const sorting = toSortingState(sortBy, sortDir);

  const handleSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      const next = applySortingToSearchParams(searchParams, updater, sorting);
      next.delete("page");
      setSearchParams(next);
    },
    [searchParams, setSearchParams, sorting],
  );

  const handleFiltersChange = useCallback(
    (filters: SiteDocFilterState) => {
      const next = new URLSearchParams(searchParams);
      setOrDeleteParam(next, "q", filters.q);
      setOrDeleteParam(next, "category", filters.category);
      setOrDeleteParam(next, "status", filters.status);
      setOrDeleteParam(next, "locale", filters.locale);
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  return {
    q,
    category,
    status,
    locale,
    sorting,
    handleSortingChange,
    handleFiltersChange,
  };
}

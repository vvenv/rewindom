import { useCallback, useEffect, useRef } from "react";

import {
  applySortingToSearchParams,
  parseListPage,
  parseListPageSize,
  parseListSort,
  toSortingState,
} from "@rewindom/module-sdk/client";
import { useLocation, useNavigate, useSearchParams } from "react-router";

import type { SiteDocFilterState } from "../lib/site-doc-list.js";
import type { SortingState, Updater } from "@tanstack/react-table";

const DOC_FILTER_KEYS = ["q", "category", "status", "locale"] as const;

/**
 * 把筛选 patch 写进 URLSearchParams。
 *
 * 用 `key in patch` 区分「没改这个键」与「显式清掉」——重置会传入
 * `{ q: undefined, … }`，必须删键；单改 locale 则只动 locale。
 *
 * 不用 React Router 的 `setSearchParams`：空参数时会 `navigate("?")`，
 * 且默认 `startTransition` 下连点/重置容易被并发渲染打乱。
 */
export function applyDocFilterPatch(
  current: URLSearchParams,
  patch: SiteDocFilterState,
): URLSearchParams {
  const params = new URLSearchParams(current);
  for (const key of DOC_FILTER_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
    const value = patch[key];
    if (value) params.set(key, value);
    else params.delete(key);
  }
  params.delete("page");
  return params;
}

function commitSearchParams(
  navigate: ReturnType<typeof useNavigate>,
  pathname: string,
  params: URLSearchParams,
): void {
  const qs = params.toString();
  // 空 search 必须 navigate(pathname)，不能 navigate("?")（会留下问号且不可靠）。
  // App 已设 BrowserRouter useTransitions={false}，location 同步更新。
  if (!qs) {
    navigate(pathname, { replace: true });
    return;
  }
  navigate({ pathname, search: `?${qs}` }, { replace: true });
}

/**
 * 文档库列表的 URL 状态：筛选 + 分页 + 排序。
 */
export function useSiteDocsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const searchParamsRef = useRef(searchParams);
  // 跟 location 对齐用 effect：避免渲染期把连点超前的 ref 打回旧 URL
  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

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
      const current = searchParamsRef.current;
      const parsed = parseListSort(current);
      const next = applySortingToSearchParams(
        current,
        updater,
        toSortingState(parsed.sortBy, parsed.sortDir),
      );
      searchParamsRef.current = next;
      commitSearchParams(navigate, pathname, next);
    },
    [navigate, pathname],
  );

  /** `patch` 只带变更项；重置时显式传入全部键（值为 `undefined`）。 */
  const handleFiltersChange = useCallback(
    (patch: SiteDocFilterState) => {
      const next = applyDocFilterPatch(searchParamsRef.current, patch);
      searchParamsRef.current = next;
      commitSearchParams(navigate, pathname, next);
    },
    [navigate, pathname],
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

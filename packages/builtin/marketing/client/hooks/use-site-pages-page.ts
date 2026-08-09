import { useCallback, useEffect, useRef } from "react";

import { useLocation, useNavigate, useSearchParams } from "react-router";

import type { SitePageFilterState } from "../lib/site-page-list.js";

const PAGE_FILTER_KEYS = ["q", "status", "locale"] as const;

/**
 * 把筛选 patch 写进 URLSearchParams（口径同 `applyDocFilterPatch`）。
 *
 * 用 `hasOwnProperty` 区分「没改这个键」与「显式清掉」：重置传入全部键 = undefined。
 */
export function applySitePageFilterPatch(
  current: URLSearchParams,
  patch: SitePageFilterState,
): URLSearchParams {
  const params = new URLSearchParams(current);
  for (const key of PAGE_FILTER_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
    const value = patch[key];
    if (value) params.set(key, value);
    else params.delete(key);
  }
  return params;
}

/**
 * 页面列表的 URL 状态：只有筛选，没有分页与排序。
 *
 * 顺序是租户自己排的（`sort_order`），不给列排序开关——那两套顺序会互相打架：
 * 按标题排完再点「上移」，动的是一个屏幕上看不见的次序。
 */
export function useSitePagesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  const filters: SitePageFilterState = {
    q: searchParams.get("q") || undefined,
    status: searchParams.get("status") || undefined,
    locale: searchParams.get("locale") || undefined,
  };

  const handleFiltersChange = useCallback(
    (patch: SitePageFilterState) => {
      const next = applySitePageFilterPatch(searchParamsRef.current, patch);
      searchParamsRef.current = next;
      const qs = next.toString();
      // 空 search 必须 navigate(pathname)，不能 navigate("?")
      navigate(qs ? { pathname, search: `?${qs}` } : pathname, {
        replace: true,
      });
    },
    [navigate, pathname],
  );

  const resetFilters = useCallback(() => {
    handleFiltersChange({ q: undefined, status: undefined, locale: undefined });
  }, [handleFiltersChange]);

  return { filters, handleFiltersChange, resetFilters };
}

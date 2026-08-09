import { setOrDeleteParam } from "./url-params";

import type { SortingState, Updater } from "@tanstack/react-table";
import type { NavigateOptions } from "react-router";

export const LIST_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const LIST_DEFAULT_PAGE_SIZE = 20;
export const SEARCH_PARAM_FILTER_ALL = "all";

export interface EnumSearchParamOptions {
  replace?: boolean;
  resetPage?: boolean;
}

type SetSearchParams = (
  nextInit: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams),
  navigateOpts?: NavigateOptions,
) => void;

export function toSearchParamEnumSet(
  options: readonly { value: string }[],
): ReadonlySet<string> {
  return new Set(options.map((option) => option.value));
}

export function enumFilterOptions<const T extends string>(
  allLabel: string,
  values: readonly T[],
  labels: Record<T, string>,
) {
  return [
    { value: SEARCH_PARAM_FILTER_ALL, label: allLabel },
    ...values.map((value) => ({ value, label: labels[value] })),
  ] as const;
}

export function parseSearchParamEnum<T extends string>(
  param: string | null,
  allowedValues: ReadonlySet<string>,
  defaultValue: T,
): T {
  if (param && allowedValues.has(param)) {
    return param as T;
  }
  return defaultValue;
}

export function applyEnumSearchParam(
  params: URLSearchParams,
  key: string,
  value: string,
  defaultValue: string,
  options?: Pick<EnumSearchParamOptions, "resetPage">,
): URLSearchParams {
  const next = new URLSearchParams(params);
  setOrDeleteParam(next, key, value === defaultValue ? undefined : value);
  if (options?.resetPage) {
    next.delete("page");
  }
  return next;
}

export function createEnumSearchParamChangeHandler(
  setSearchParams: SetSearchParams,
  key: string,
  defaultValue: string,
  options?: EnumSearchParamOptions,
): (value: string) => void {
  return (value: string) => {
    setSearchParams(
      (params) =>
        applyEnumSearchParam(params, key, value, defaultValue, options),
      options?.replace ? { replace: true } : undefined,
    );
  };
}

export function parseListPage(value: string | null, defaultValue = 1): number {
  const parsed = parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

export function parseListPageSize(
  value: string | null,
  defaultValue = LIST_DEFAULT_PAGE_SIZE,
): number {
  const parsed = parseInt(value ?? "", 10);
  if (
    Number.isFinite(parsed) &&
    (LIST_PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
  ) {
    return parsed;
  }
  return defaultValue;
}

export function parseListSort(
  searchParams: URLSearchParams,
  directionKey: "sort_dir" | "sort_order" = "sort_dir",
): {
  sortBy?: string;
  sortDir?: "asc" | "desc";
} {
  const sortBy = searchParams.get("sort_by") || undefined;
  const sortDirParam = searchParams.get(directionKey);
  const sortDir =
    sortDirParam === "asc" || sortDirParam === "desc"
      ? sortDirParam
      : undefined;

  return { sortBy, sortDir };
}

export function toSortingState(
  sortBy?: string,
  sortDir?: "asc" | "desc",
): SortingState {
  return sortBy ? [{ id: sortBy, desc: sortDir !== "asc" }] : [];
}

export function applySortingToSearchParams(
  searchParams: URLSearchParams,
  updater: Updater<SortingState>,
  currentSorting: SortingState,
  directionKey: "sort_dir" | "sort_order" = "sort_dir",
): URLSearchParams {
  const nextSorting =
    typeof updater === "function" ? updater(currentSorting) : updater;
  const params = new URLSearchParams(searchParams);

  if (nextSorting.length > 0) {
    params.set("sort_by", nextSorting[0]!.id);
    params.set(directionKey, nextSorting[0]!.desc ? "desc" : "asc");
  } else {
    params.delete("sort_by");
    params.delete(directionKey);
  }

  params.set("page", "1");
  return params;
}

export function getOptionalSearchParam(
  searchParams: URLSearchParams,
  key: string,
): string | undefined {
  const value = searchParams.get(key);
  return value || undefined;
}

export function parseSearchParamsPagination(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
} {
  return {
    page: parseListPage(searchParams.get("page")),
    pageSize: parseListPageSize(searchParams.get("page_size")),
  };
}

/**
 * 列表页是否处于「有筛选条件」状态：空态文案要据此在
 * 「一条都还没有」与「没有匹配结果」之间切换（见 EmptyState 用法）。
 * 空串 / undefined / `all` 都算没筛选——与 URL 参数的写入口径一致。
 */
export function hasActiveFilters(
  filters: Record<string, string | undefined | null>,
): boolean {
  return Object.values(filters).some(
    (value) => Boolean(value) && value !== SEARCH_PARAM_FILTER_ALL,
  );
}

export function applyFiltersToSearchParams<
  T extends { [K in keyof T]?: string | undefined },
>(searchParams: URLSearchParams, filters: T): URLSearchParams {
  const params = new URLSearchParams(searchParams);

  for (const [key, value] of Object.entries(filters) as Array<
    [string, string | undefined]
  >) {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  }

  params.set("page", "1");
  return params;
}

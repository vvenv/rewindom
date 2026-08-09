/**
 * 卡片式列表没有可点的表头，排序改由筛选栏的下拉承担：
 * 下拉值 `字段:方向` 与 URL 的 `sort_by` / `sort_dir` 一一对应，
 * 字段名与 `server/bookmark.service.ts` 的 BOOKMARK_SORTABLE_FIELDS 保持一致。
 */
export const BOOKMARK_SORT_FIELDS = [
  "updated_at",
  "created_at",
  "title",
  "host",
] as const;

export type BookmarkSortField = (typeof BOOKMARK_SORT_FIELDS)[number];
export type BookmarkSortDir = "asc" | "desc";

export interface BookmarkSort {
  sortBy: BookmarkSortField;
  sortDir: BookmarkSortDir;
}

export const BOOKMARK_SORT_OPTIONS = [
  { value: "updated_at:desc" },
  { value: "updated_at:asc" },
  { value: "created_at:desc" },
  { value: "created_at:asc" },
  { value: "title:asc" },
  { value: "title:desc" },
  { value: "host:asc" },
] as const;

type BookmarkSortTranslate = (key: string) => string;

function sortOptionKey(value: string): string {
  return `sort.${value.replace(":", "_")}`;
}

export function getBookmarkSortOptions(t: BookmarkSortTranslate): Array<{
  value: string;
  label: string;
}> {
  return BOOKMARK_SORT_OPTIONS.map((option) => ({
    value: option.value,
    label: t(sortOptionKey(option.value)),
  }));
}

/** 与服务端 `resolveSortField` / `resolveSortOrder` 的兜底一致。 */
export const DEFAULT_BOOKMARK_SORT_VALUE = "updated_at:desc";

function isSortField(value: string | undefined): value is BookmarkSortField {
  return (BOOKMARK_SORT_FIELDS as readonly string[]).includes(value ?? "");
}

/** URL 参数 → 下拉当前值；非法或缺省一律落到默认排序。 */
export function toBookmarkSortValue(
  sortBy: string | undefined,
  sortDir: string | undefined,
): string {
  if (!isSortField(sortBy)) {
    return DEFAULT_BOOKMARK_SORT_VALUE;
  }
  return `${sortBy}:${sortDir === "asc" ? "asc" : "desc"}`;
}

/** 下拉值 → URL 参数。 */
export function fromBookmarkSortValue(value: string): BookmarkSort {
  const [field, dir] = value.split(":");
  if (!isSortField(field)) {
    return { sortBy: "updated_at", sortDir: "desc" };
  }
  return { sortBy: field, sortDir: dir === "asc" ? "asc" : "desc" };
}

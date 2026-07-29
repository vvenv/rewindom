/**
 * 卡片式列表没有可点的表头，排序改由筛选栏的下拉承担：
 * 下拉值 `字段:方向` 与 URL 的 `sort_by` / `sort_dir` 一一对应，
 * 字段名与 `server/note.service.ts` 的 NOTE_SORTABLE_FIELDS 保持一致。
 */
export const NOTE_SORT_FIELDS = ["updated_at", "created_at", "title"] as const;

export type NoteSortField = (typeof NOTE_SORT_FIELDS)[number];
export type NoteSortDir = "asc" | "desc";

export interface NoteSort {
  sortBy: NoteSortField;
  sortDir: NoteSortDir;
}

export const NOTE_SORT_OPTIONS = [
  { value: "updated_at:desc", label: "最近更新" },
  { value: "updated_at:asc", label: "最早更新" },
  { value: "created_at:desc", label: "最近创建" },
  { value: "created_at:asc", label: "最早创建" },
  { value: "title:asc", label: "标题 A → Z" },
  { value: "title:desc", label: "标题 Z → A" },
] as const;

/** 与服务端 `resolveSortField` / `resolveSortOrder` 的兜底一致。 */
export const DEFAULT_NOTE_SORT_VALUE = "updated_at:desc";

function isSortField(value: string | undefined): value is NoteSortField {
  return (NOTE_SORT_FIELDS as readonly string[]).includes(value ?? "");
}

/** URL 参数 → 下拉当前值；非法或缺省一律落到默认排序。 */
export function toNoteSortValue(
  sortBy: string | undefined,
  sortDir: string | undefined,
): string {
  if (!isSortField(sortBy)) {
    return DEFAULT_NOTE_SORT_VALUE;
  }
  return `${sortBy}:${sortDir === "asc" ? "asc" : "desc"}`;
}

/** 下拉值 → URL 参数。 */
export function fromNoteSortValue(value: string): NoteSort {
  const [field, dir] = value.split(":");
  if (!isSortField(field)) {
    return { sortBy: "updated_at", sortDir: "desc" };
  }
  return { sortBy: field, sortDir: dir === "asc" ? "asc" : "desc" };
}

export const TODO_TITLE_MAX_LENGTH = 200;

/** 待办清单的三段筛选；`all` 是「未筛选」态，不进 URL */
export const TODO_STATUS_ALL = "all";

export const TODO_STATUS_FILTER_OPTIONS = [
  { value: TODO_STATUS_ALL, labelKey: "filter.all" },
  { value: "active", labelKey: "filter.active" },
  { value: "done", labelKey: "filter.done" },
] as const;

export type TodoStatusFilter =
  (typeof TODO_STATUS_FILTER_OPTIONS)[number]["value"];

export function parseTodoStatus(value: string | null): TodoStatusFilter {
  return TODO_STATUS_FILTER_OPTIONS.some((option) => option.value === value)
    ? (value as TodoStatusFilter)
    : TODO_STATUS_ALL;
}

/** 筛选态 → API 的 completed 参数（undefined = 不筛） */
export function todoStatusToCompleted(
  status: TodoStatusFilter,
): boolean | undefined {
  if (status === "active") return false;
  if (status === "done") return true;
  return undefined;
}

export function validateTodoTitle(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) {
    return "validation.titleRequired";
  }
  if (trimmed.length > TODO_TITLE_MAX_LENGTH) {
    return "validation.titleTooLong";
  }

  return null;
}

export type TodoTitleEdit =
  | { action: "none" }
  | { action: "save"; title: string }
  | { action: "delete" }
  | { action: "invalid"; message: string };

/**
 * 就地编辑提交后该做什么。TodoMVC 的规矩：改成空标题＝删掉这条，
 * 没改动就什么都不做（别为一次误触发一趟 PATCH 和一条审计）。
 */
export function resolveTodoTitleEdit(
  original: string,
  draft: string,
): TodoTitleEdit {
  const trimmed = draft.trim();
  if (!trimmed) {
    return { action: "delete" };
  }
  if (trimmed === original.trim()) {
    return { action: "none" };
  }

  const validationError = validateTodoTitle(trimmed);
  if (validationError) {
    return { action: "invalid", message: validationError };
  }

  return { action: "save", title: trimmed };
}

export const TODO_TITLE_MAX_LENGTH = 200;

/** 待办清单的三段筛选；`all` 是「未筛选」态，不进 URL */
export const TODO_STATUS_ALL = "all";

export const TODO_STATUS_FILTER_OPTIONS = [
  { value: TODO_STATUS_ALL, label: "全部" },
  { value: "active", label: "未完成" },
  { value: "done", label: "已完成" },
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

export interface TodoFormValues {
  title: string;
  completed: boolean;
}

export const INITIAL_TODO_FORM: TodoFormValues = {
  title: "",
  completed: false,
};

export function validateTodoForm(values: TodoFormValues): string | null {
  const title = values.title.trim();
  if (!title) {
    return "请输入标题";
  }
  if (title.length > TODO_TITLE_MAX_LENGTH) {
    return `标题不能超过 ${TODO_TITLE_MAX_LENGTH} 个字符`;
  }

  return null;
}

export function buildTodoPayload(values: TodoFormValues): {
  title: string;
  completed: boolean;
} {
  return {
    title: values.title.trim(),
    completed: values.completed,
  };
}
